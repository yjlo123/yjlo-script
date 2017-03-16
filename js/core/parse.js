var make_parse = function () {
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
		case "_!": // not
			return 7;
		case "*":
		case "/":
		case "/.":
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
		print("parsing expression: "+token.value);

		var left_node;
		var expression_nodes_infix = [];
		var bracket_count = 0;
		
		while (token && token.value !== "," && token.value !== ";" && token.value !== "{") {
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
				var is_boolean = (token.value=="true") || (token.value=="false");
				left_node = new_var_node(token.value, is_boolean ? "boolean" : "variable");
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
			var prevNode = i>0?expression_nodes_infix[i-1]:null;
			var thisNode = expression_nodes_infix[i];
			if(thisNode.name === '('){
				temp_stack.push(thisNode);
			} else if (thisNode.type === 'variable' || thisNode.tag === 'application') {
				expression_nodes_postfix.push(thisNode);
			} else if (thisNode.type === 'boolean' ) {
				expression_nodes_postfix.push(thisNode.name==="true" ? true : false);
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
					&& (expression_nodes_postfix.length === 0 || (prevNode && prevNode.name === '('))) {
						// negative operator
						thisNode.name = '_-';
					}
				if (thisNode.name === '!') {
					thisNode.name = '_!';
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
			case "for":
				advance();
				v = for_stmt();
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
						case "/.=":
						case "%=":
						case "**=":
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
		advance(";");
		return n;
	};

/*===================== ASSIGN ======================= */
	var assign = function(var_token, operator, value) {
		print("parsing assign. " + token.value);
		if (var_token.type !== "name") {
			throw new Error("Expected a new variable name.");
		}
		var t = new_node();
		t.tag = "assignment";
		t.variable = var_token.value;
		if (operator){
			// Compound Assignment
			advance(operator);
			var apply_node = {};
			apply_node.tag = "application";
			apply_node.operator = new_var_node(operator.slice(0, -1), "operator");
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
		n.predicate = condition();
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
		n.predicate = condition();
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
		n.predicate = condition();
		advance(";");
		return n;
	};

/*===================== FOR ======================= */
	var for_stmt = function() {
		print("parsing for.");
		var bracket = token.value === '(';
		if (bracket) { advance('('); }
		var n = new_node();
		n.tag = "for";
		// variable
		if (token.type !== "name") {
			throw new Error("Expected a variable name after for.");
		}
		n.variable = new_var_node(token.value, "variable");
		advance();
		// range
		n.range = parse_range();
		// increment
		n.increment = parse_increment();
		if (bracket) { advance(')'); }
		n.consequent = block();
		return n;
	};

	var parse_range = function() {
		var range = {};
		advance("in");
		advance('(');
		var first_value = expression();
		if(token.value === ')') {
			range.from = 0;
			range.to = first_value;
		} else {
			range.from = first_value;
			advance(',');
			range.to = expression();
		}
		advance(')');
		return range;
	};

	var parse_increment = function() {
		if (token.value !== "by"){
			return null;
		}
		advance("by");
		return expression();
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

/*===================== CONDITION ======================= */
	var condition = function() {
		var condition_expression = null;
		if (token.value !== '('){
			condition_expression = expression();
		} else {
			advance("(");
			condition_expression = expression();
			advance(")");
		}
		return condition_expression;
	};

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
		tokens = source.tokens('=<>!+-*&|/%^*', '=<>&|*+-.');
		if(!tokens || tokens.length == 0){
			throw Error("Empty source code.");
		}
		//print(tokens);
		print("start parsing.");
		token_nr = 0;
		token = tokens[token_nr];
		next_token = tokens[token_nr+1];
		var s = statements();
		return s;
	};
};