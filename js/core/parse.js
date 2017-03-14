var make_parse = function () {
	var scope;
	var symbol_table = {};
	var token;
	var next_token;
	var tokens;
	var token_nr;

	var new_node = function() {
		return {};
	};

	var new_var_node = function(name, type) {
		var node = new_node();
		node.tag = "variable";
		node.name = name;
		node.type = type;
		return node;
	};

	var isConstantToken = function (t) {
		return t.type === "string" || t.type === "number";
	};

	var isVarNameToken = function (t) {
		return t.type === "name";
	};

	var idOperatorToken = function (t) {
		return t.type === 'operator';
	};

	var precedence = function(operator) {
		switch(operator){
		case "**": // power
			return 8;
		case "_-": // negative
			return 7;
		case "*":
		case "/":
		case "%":
			return 6;
		case "+":
		case "-":
			return 5;
		case "<":
		case "<=":
		case ">":
		case ">=":
			return 4;
		case "==":
		case "!=":
			return 3;
		case "&&":
			return 2;
		case "||":
			return 1;
		default:
			return 0;
		}
	}

	var advance = function (value) {
		if (token_nr >= tokens.length) {
			token = {};
			token.value = "(end)";
			return;
		}
		
		if (value && token.value !== value) {
			throw new Error("Expected '" + value + "'. But "+token.value+" encountered.");
		}
		token_nr = token_nr + 1;
		token = tokens[token_nr];
		next_token = (token_nr + 1) < tokens.length ? tokens[token_nr + 1] : null;
		return token;
	};

	var expression = function () {
		//print("++++++ "+token.value);
		print("parsing expression: "+token.value);

		var left_node;
		var expression_nodes_infix = [];
		var bracket_count = 0;
		
		while (token && token.value !== "," && token.value !== ";") {
			if(token.value === ")" && bracket_count === 0){
				// end of current expression
				break;
			}

			if(token.value === '(')bracket_count += 1;
			if(token.value === ')') bracket_count -= 1;
			if(isVarNameToken(token) && next_token && next_token.value === '('){
				// function call in expression
				var func_token = token;
				advance();
				expression_nodes_infix.push(func_call(func_token));
				continue;
			} else if(isConstantToken(token)) {
				// constant
				left_node = new_node();
				left_node.tag = "constant";
				left_node.value = token.value;
			} else if(isVarNameToken(token)) {
				// variable
				left_node = new_var_node(token.value, "variable");
			} else if(idOperatorToken(token)) {
				// operator
				left_node = new_var_node(token.value, "operator");
			} else {
				throw new Error("Expected expression. But " + token.value + " encountered.");
			}
			expression_nodes_infix.push(left_node);
			advance();
		}

		// push the rest closing brackets
		while (bracket_count > 0) {
			expression_nodes_infix.push(token);
			advance(')');
			bracket_count -= 1;
		}

		// convert infix order to post fix order
		var expression_nodes_postfix = [];
		var temp_stack = [];
		for (var i = 0; i < expression_nodes_infix.length; i++) {
			var thisNode = expression_nodes_infix[i];
			if(thisNode.name === '('){
				temp_stack.push(thisNode);
			} else if (thisNode.type === 'variable' || thisNode.tag === 'application') {
				expression_nodes_postfix.push(thisNode);
			} else if (thisNode.tag === 'constant') {
				expression_nodes_postfix.push(thisNode.value);
			} else if (thisNode.name === ')'){
				while (temp_stack.length > 0 && temp_stack[temp_stack.length-1].name !== '(') {
					expression_nodes_postfix.push(temp_stack.pop());
				}
				if (temp_stack.length > 0){
					temp_stack.pop(); // pop '('
				}else{
					throw new Error("Unmatched bracket");
				}
			} else {
				// operators
				/* prefix all unary operators with '_' ! */
				if (thisNode.name === '-'
					&& (expression_nodes_postfix.length === 0 || (temp_stack.length > 0 && temp_stack[temp_stack.length-1].name === '('))){
						// negative operator
						thisNode.name = '_-';
					}
				while (temp_stack.length > 0 
						&& precedence(thisNode.name) <= precedence(temp_stack[temp_stack.length-1].name)) {
							expression_nodes_postfix.push(temp_stack.pop());
				}
				temp_stack.push(thisNode);
			}
		}
		while (temp_stack.length > 0){
			expression_nodes_postfix.push(temp_stack.pop());
		}

		if (expression_nodes_postfix.length == 1) {
			return expression_nodes_postfix[0];
		}

		// build syntax tree
		var tree_stack = [];
		for (var i = 0; i < expression_nodes_postfix.length; i++) {
			if (expression_nodes_postfix[i].type === 'operator'){
				var apply_node = {};
				var operands = [];
				operands.unshift(tree_stack.pop());
				if (expression_nodes_postfix[i].name.charAt(0) !== '_'){
					// not a unary operator
					operands.unshift(tree_stack.pop());
				}
				apply_node.tag = "application";
				apply_node.operator = expression_nodes_postfix[i];
				apply_node.operands = array_to_list(operands);
				tree_stack.push(apply_node);
			}else{
				tree_stack.push(expression_nodes_postfix[i]);
			}
		}

		return tree_stack[0];
	};


	var statement = function () {
		var n = token, v;

		//print("[ ---- parsing statement.  " + n.value);
		switch (n.value){
			case "var":
				advance();
				v = var_def();
				break;
			case "func":
				advance();
				v = func();
				break;
			case "if":
				advance();
				v = if_stmt();
				break;
			case "while":
				advance();
				v = while_stmt();
				break;
			case "do":
				advance();
				v = do_while_stmt();
				break;
			case "return":
				advance();
				v = return_stmt();
				break;
			default:
				if(next_token){
					// Assignment statement
					var prev_token = token;
					var next_operator = next_token.value;
					switch (next_operator){
						case "=":
							advance();
							v = assign(prev_token);
							break;
						case "+=":
						case "-=":
						case "*=":
						case "/=":
						case "%=":
							advance();
							v = assign(prev_token, next_operator);
							break;
						case "++":
						case "--":
							advance();
							v = assign(prev_token, next_operator, 1);
							break;
						default:
							v = expression();
							advance(";");
					}
				}
		}
		//print("] ---- end of statement.  ");
		return v;
	};

	var statements = function () {
		print("parsing statements.");
		var stmts = [], stmt;
		//print("------statement list check "+token.value);
		while (true) {
			if (token_nr === tokens.length || token.value === '}') {
				print("end of statement list");
				break;
			}
			stmt = statement();
			
			if (stmt) {
				stmts.push(stmt);
			}
		}
		return stmts.length === 0? null : array_to_list(stmts);
	};


/*===================== FUNC CALL ======================= */
	var func_call = function(t) {
		print("parsing func call. "+t.value);
		var a = new_node();
		var operator = new_var_node(t.value);
		var operands = [];
		advance("(");
		if (token.value !== ")") {
			while (true) {
				var o = expression();
				operands.push(o);
				//advance();
				if (token.value === ")") {
					break;
				}
				advance(",");
			}
		}
		advance(")");
		a.tag = "application";
		a.operator = operator;
		a.operands = array_to_list(operands);
		return a;
	};
	
	
/*===================== RETURN ======================= */
	var return_stmt = function() {
		print("parsing return. "+token.value);
		var n = new_node();
		n.tag = "return_statement";
		n.expression = expression();
		//advance(); // return expression
		advance(";");
		return n;
	};

/*===================== ASSIGN ======================= */
	var assign = function(var_token, operator, value) {
		print("parsing assign. " + token.value);
		var t = new_node();

		if (var_token.type !== "name") {
			throw new Error("Expected a new variable name.");
		}
		t.tag = "assignment";
		t.variable = var_token.value;
		if (operator){
			// Compound Assignment
			advance(operator);
			var apply_node = {};
			apply_node.tag = "application";
			apply_node.operator = new_var_node(operator.charAt(0), "operator");
			apply_node.operands = array_to_list([
										new_var_node(var_token.value, "variable"),
										value || expression()]);
			t.value = apply_node;
		}else{
			advance("=");
			t.value = expression();
		}
		advance(";");
		return t;
	};

/*===================== FUNC ======================= */
	var func = function() {
		print("parsing function. "+token.value);
		var args = [];
		var funcbody = {};
		var t = new_node();

		if (token.type === "name") {
			t.variable = token.value;
			t.tag = "var_definition";
		}
		advance(); // func name
		advance("(");
		if (token.value !== ")") {
			while (true) {
				if (token.type !== "name") {
					throw new Error("Expected a parameter name.");
				}
				args.push(token.value);
				advance();
				if (token.value !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance(")");
		funcbody.parameters = array_to_list(args);
		advance("{");
		funcbody.body = statements();
		advance("}");
		funcbody.tag = "function_definition";
		t.value = funcbody;
		
		return t;
	};

/*===================== VAR DEF ======================= */
	var var_def = function() {
		print("parsing var def. " + token.value);
		var a = [], n, t;
		while (true) {
			n = token;
			if (n.type !== "name") {
				throw new Error("Expected a new variable name.");
			}
			advance();
			if (token.value === "=") {
				t = new_node();
				advance();
				t.variable = n.value;
				t.value = expression();
				
				t.tag = "var_definition";
				a.push(t);
				//advance();
			}
			if (token.value !== ",") {
				break;
			}
			advance(",");
		}
		advance(";");
		return a.length === 0 ? null : a.length === 1 ? a[0] : a;
	};

/*===================== IF ======================= */
	var if_stmt = function() {
		print("parsing if.");
		var n = new_node();
		n.tag = "if";
		advance("(");
		n.predicate = expression();
		advance(")");
		n.consequent = block();
		if (token.value === "else") {
			advance("else");
			n.alternative = block();
		} else {
			n.alternative = null;
		}
		return n;
	};
	
/*===================== WHILE ======================= */
	var while_stmt = function() {
		print("parsing while.");
		var n = new_node();
		n.tag = "while";
		advance("(");
		n.predicate = expression();
		advance(")");
		n.consequent = block();
		return n;
	};

/*===================== DO WHILE ======================= */
	var do_while_stmt = function() {
		print("parsing do.");
		var n = new_node();
		n.tag = "do";
		n.consequent = block();
		advance("while");
		advance("(");
		n.predicate = expression();
		advance(")");
		advance(";");
		return n;
	};

/*===================== BLOCK ======================= */
	var block = function() {
		var block_stmts = null;
		if (token.value !== '{'){
			// single statement block
			block_stmts = array_to_list([statement()]);
		} else {
			advance("{");
			block_stmts = statements();
			advance("}");
		}
		return block_stmts;
	};







/* code for reference */

	var _block = function () {
		var t = token;
		advance("{");
		return t.std();
	};

	var original_symbol = {
		nud: function () {
			this.error("Undefined.");
		},
		led: function (left) {
			this.error("Missing operator.");
		}
	};

	var symbol = function (id, bp) {
		var s = symbol_table[id];
		bp = bp || 0;
		if (s) {
			if (bp >= s.lbp) {
				s.lbp = bp;
			}
		} else {
			s = Object.create(original_symbol);
			s.id = s.value = id;
			s.lbp = bp;
			symbol_table[id] = s;
		}
		return s;
	};

	var constant = function (s, v) {
		var x = symbol(s);
		x.nud = function () {
			scope.reserve(this);
			this.value = symbol_table[this.id].value;
			this.arity = "literal";
			return this;
		};
		x.value = v;
		return x;
	};

	var infix = function (id, bp, led) {
		var s = symbol(id, bp);
		s.led = led || function (left) {
			this.first = left;
			this.second = expression(bp);
			this.arity = "binary";
			return this;
		};
		return s;
	};

	var infixr = function (id, bp, led) {
		var s = symbol(id, bp);
		s.led = led || function (left) {
			this.first = left;
			this.second = expression(bp - 1);
			this.arity = "binary";
			return this;
		};
		return s;
	};

	var assignment = function (id) {
		return infixr(id, 10, function (left) {
			if (left.id !== "." && left.id !== "[" && left.arity !== "name") {
				left.error("Bad lvalue.");
			}
			this.first = left;
			this.second = expression(9);
			this.assignment = true;
			this.arity = "binary";
			return this;
		});
	};

	var prefix = function (id, nud) {
		var s = symbol(id);
		s.nud = nud || function () {
			scope.reserve(this);
			this.first = expression(70);
			this.arity = "unary";
			return this;
		};
		return s;
	};

	var stmt = function (s, f) {
		var x = symbol(s);
		x.std = f;
		return x;
	};

	symbol("(end)");
	symbol("(name)");
	symbol(":");
	symbol(";");
	symbol(")");
	symbol("]");
	symbol("}");
	symbol(",");
	symbol("else");

	constant("true", true);
	constant("false", false);
	constant("null", null);
	constant("pi", 3.141592653589793);
	constant("Object", {});
	constant("Array", []);

	//symbol("(literal)").nud = itself;

	symbol("this").nud = function () {
		scope.reserve(this);
		this.arity = "this";
		return this;
	};

	assignment("=");
	assignment("+=");
	assignment("-=");

	infix("?", 20, function (left) {
		this.first = left;
		this.second = expression(0);
		advance(":");
		this.third = expression(0);
		this.arity = "ternary";
		return this;
	});

	infixr("&&", 30);
	infixr("||", 30);

	infixr("===", 40);
	infixr("!==", 40);
	infixr("<", 40);
	infixr("<=", 40);
	infixr(">", 40);
	infixr(">=", 40);

	infix("+", 50);
	infix("-", 50);

	infix("*", 60);
	infix("/", 60);

	infix(".", 80, function (left) {
		this.first = left;
		if (token.arity !== "name") {
			token.error("Expected a property name.");
		}
		token.arity = "literal";
		this.second = token;
		this.arity = "binary";
		advance();
		return this;
	});

	infix("[", 80, function (left) {
		this.first = left;
		this.second = expression(0);
		this.arity = "binary";
		advance("]");
		return this;
	});

	infix("(", 80, function (left) {
		var a = [];
		if (left.id === "." || left.id === "[") {
			this.arity = "ternary";
			this.first = left.first;
			this.second = left.second;
			this.third = a;
		} else {
			this.arity = "binary";
			this.first = left;
			this.second = a;
			if ((left.arity !== "unary" || left.id !== "function") &&
					left.arity !== "name" && left.id !== "(" &&
					left.id !== "&&" && left.id !== "||" && left.id !== "?") {
				left.error("Expected a variable name.");
			}
		}
		if (token.id !== ")") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance(")");
		return this;
	});


	prefix("!");
	prefix("-");
	prefix("typeof");

	prefix("(", function () {
		var e = expression(0);
		advance(")");
		return e;
	});

	stmt("func", function () {
		print(" parsing function");
		var args = [];
		var funcbody = Object.create(original_symbol);
		new_scope();
		if (token.arity === "name") {
			scope.define(token);
			this.variable = token.value;
			this.tag = "var_definition";
			advance();
		}

		advance("(");
		if (token.id !== ")") {
			while (true) {
				if (token.arity !== "name") {
					token.error("Expected a parameter name.");
				}
				scope.define(token);
				args.push(token);
				advance();
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		funcbody.parameters = args;
		advance(")");
		advance("{");
		funcbody.body = statements();
		advance("}");
		funcbody.arity = "function";
		funcbody.tag = "function_definition";
		this.value = funcbody;
		scope.pop();
		return this;
	});

	prefix("[", function () {
		var a = [];
		if (token.id !== "]") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance("]");
		this.first = a;
		this.arity = "unary";
		return this;
	});

	prefix("{", function () {
		var a = [], n, v;
		if (token.id !== "}") {
			while (true) {
				n = token;
				if (n.arity !== "name" && n.arity !== "literal") {
					token.error("Bad property name.");
				}
				advance();
				advance(":");
				v = expression(0);
				v.key = n.value;
				a.push(v);
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance("}");
		this.first = a;
		this.arity = "unary";
		return this;
	});


	stmt("{", function () {
		new_scope();
		var a = statements();
		advance("}");
		scope.pop();
		return a;
	});

	stmt("if", function () {
		advance("(");
		this.first = expression(0);
		advance(")");
		this.second = block();
		if (token.id === "else") {
			scope.reserve(token);
			advance("else");
			this.third = token.id === "if" ? statement() : block();
		} else {
			this.third = null;
		}
		this.arity = "statement";
		return this;
	});

	stmt("return", function () {
		if (token.id !== ";") {
			this.first = expression(0);
		}
		advance(";");
		if (token.id !== "}") {
			token.error("Unreachable statement.");
		}
		this.arity = "statement";
		return this;
	});

	stmt("break", function () {
		advance(";");
		if (token.id !== "}") {
			token.error("Unreachable statement.");
		}
		this.arity = "statement";
		return this;
	});

	stmt("while", function () {
		advance("(");
		this.first = expression(0);
		advance(")");
		this.second = block();
		this.arity = "statement";
		return this;
	});

/* helper functions */

	function print(msg){
		if(debug){
			console.log(msg);
		}
	}
	
	function array_to_list(arr){
		var lst = list();
		for(var i = arr.length-1; i >= 0; i--){
			lst = pair(arr[i], lst);
		}
		return lst;
	}

	return function (source) {
		tokens = source.tokens('=<>!+-*&|/%^*', '=<>&|*+-');
		if(!tokens || tokens.length == 0){
			throw Error("Empty source code.");
		}
		//print(tokens);
		print("start parsing.");
		token_nr = 0;
		token = tokens[token_nr];
		next_token = tokens[token_nr+1];
		//advance();
		var s = statements();
		//advance("(end)");
		return s;
	};
};