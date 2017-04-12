var make_parse = function () {
	var token;
	var next_token;
	var tokens;
	var token_nr;
	
	var reservedKeywords = ["var", "func", "import", 
	"if", "else", "switch", "fallthrough", "case", "default",
	"continue", "break", "while", "do", "for", "in", "by", "return"];

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
	
	var new_constant_node = function(value) {
		var node = new_node();
		node.tag = "constant";
		node.value = value;
		return node;
	}

	var isConstantToken = function (t) {
		return t.type === "string" || t.type === "number";
	};

	var isVarNameToken = function (t) {
		if (reservedKeywords.indexOf(t.value) != -1){
			return false;
		}
		return t.type === "name";
	};

	var isOperatorToken = function (t) {
		return t.type === 'operator';
	};

	var isOpeningBracketToken = function (t) {
		return t && isOperatorToken(t) && t.value === "(";
	};

	var isClosingBracketToken = function (t) {
		return t && isOperatorToken(t) && t.value === ")";
	};

	var precedence = function(operator) {
		switch(operator){
		case ".": // reference
			return 13;
		case "**": // power
			return 12;
		case "_-": // negative
		case "_!": // not
		case "_~":
			return 11;
		case "*":
		case "/":
		case "/.":
		case "%":
			return 10;
		case "+":
		case "-":
			return 9;
		case "<<":
		case ">>":
		case ">>>":
			return 8;
		case "<":
		case "<=":
		case ">":
		case ">=":
			return 7;
		case "==":
		case "!=":
			return 6;
		case "&":
			return 5;
		case "^":
			return 4;
		case "|":
			return 3;
		case "&&":
			return 2;
		case "||":
			return 1;
		default:
			return 0;
		}
	};

	var advance = function (value) {
		if (token_nr >= tokens.length) {
			token = {};
			token.value = "(end)";
			return;
		}
		
		if (value && token.value !== value) {
			throw new Error("Expected '" + value + "'. But '"+token.value+"' found.");
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

		if (token && token.value === "func"){
			// function expression, should be anonymous
			advance("func");
			if (isVarNameToken(token)){
				// ignore given name
				advance();
			}
			return func();
		}

		// read in the tokens in this expression
		while (token
			// , ; {
			&& !/^[,;{]$/.test(token.value)
			&& token.value !== "="
			// compound assignment += -= *= /= /.= &= |= ^= <<= >>= >>>=
			&& !/^([+\-\*\/%&|^]|\/\.|[<>]{2}|[>]{3})=$/.test(token.value)
			&& token.value !== "++" && token.value !== "--") {
			if(isClosingBracketToken(token) && bracket_count === 0) {
				// end of current expression
				break;
			}

			if(isOpeningBracketToken(token)) bracket_count += 1;
			if(isClosingBracketToken(token)) bracket_count -= 1;
			if (isVarNameToken(token) && isOpeningBracketToken(next_token)){
				// function call in expression
				var func_token = token;
				advance();
				expression_nodes_infix.push(func_call(func_token));
				continue;
			} else if (isConstantToken(token)) {
				// constant
				left_node = new_constant_node(token.value);
			} else if(isVarNameToken(token)) {
				// variable
				var is_boolean = (token.value=="true") || (token.value=="false");
				left_node = new_var_node(token.value, is_boolean ? "boolean" : "variable");
			} else if(isOperatorToken(token)) {
				// operator
				left_node = new_var_node(token.value, "operator");
			} else {
				throw new Error("Expected expression. But '" + token.value + "' found.");
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
		
		// empty expression
		if (expression_nodes_infix.length === 0) {
			return new_var_node("null", "variable");
		}
		
		// convert in-fix order to post-fix order
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
			} else if (thisNode.name === ')') {
				while (temp_stack.length > 0 && temp_stack[temp_stack.length-1].name !== '(') {
					expression_nodes_postfix.push(temp_stack.pop());
				}
				if (temp_stack.length > 0) {
					temp_stack.pop(); // pop '('
				} else {
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
				if (thisNode.name === '!' || thisNode.name === '~') {
					thisNode.name = '_' + thisNode.name;
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
			if (expression_nodes_postfix[i].type === 'operator' || expression_nodes_postfix[i].type === 'reference'){
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

		switch (n.value){
			case ";":
				advance();
				break;
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
			case "switch":
				advance();
				v = switch_stmt();
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
			case "continue":
				advance();
				v = continue_stmt();
				break;
			case "break":
				advance();
				v = break_stmt();
				break;
			case "return":
				advance();
				v = return_stmt();
				break;
			case "fallthrough":
				advance();
				v = fallthrough_stmt();
				break;
			default:
				v = expression();
				if(token){
					// Assignment statement
					var prev_token = token;
					switch (token.value){
						case "=":
							advance();
							v = assign(v, null);
							break;
						case "+=":
						case "-=":
						case "*=":
						case "/=":
						case "/.=":
						case "%=":
						case "**=":
						case "&=":
						case "|=":
						case "^=":
						case "<<=":
						case ">>=":
						case ">>>=":
							advance();
							v = assign(v, prev_token.value);
							break;
						case "++":
						case "--":
							advance();
							v = assign(v, prev_token.value, 1);
							break;
						default:
							advance(";");
					}
				}
		}
		return v;
	};

	var statements = function () {
		print("parsing statements.");
		var stmts = [], stmt;
		while (true) {
			if (token_nr === tokens.length 
				|| token.value === '}'
				|| token.value === 'case'
				|| token.value === 'default') {
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
	var func_call = function(t, operator) {
		print("parsing func call. "+t.value);
		var a = new_node();
		a.tag = "application";
		a.operator = operator || new_var_node(t.value);
		var operands = [];
		advance("(");
		if (!isClosingBracketToken(token)) {
			while (true) {
				var o = expression();
				operands.push(o);
				if (isClosingBracketToken(token)) {
					break;
				}
				advance(",");
			}
		}
		advance(")");
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
	var assign = function(left, operator, value) {
		print("parsing assign. " + token.value);
		
		var t = new_node();
		t.tag = "assignment";
		var right_var_node = null;
		
		if (left.tag === "application"){
			// assign to reference
			t.left = left;
			right_var_node = left;
		} else if (left.type !== "variable") {
			throw new Error("Expected a new variable name, but '"+left.value+"' found.");
		} else {
			// assign to variable
			t.variable = left.name;
			right_var_node = new_var_node(left.name, "variable");
		}

		if (operator){
			// Compound Assignment
			var apply_node = {};
			apply_node.tag = "application";
			apply_node.operator = new_var_node(operator.slice(0, -1), "operator");
			apply_node.operands = array_to_list([
										right_var_node,
										value || expression()]);
			t.value = apply_node;
		}else{
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

		if (isVarNameToken(token)) {
			t.variable = token.value;
			t.tag = "var_definition";
			advance(); // func name
		} else if (isOpeningBracketToken(token)) {
			// anonymous function
		} else {
			throw new Error("Invalid function name.");
		}

		advance("(");
		if (!isClosingBracketToken(token)) {
			while (true) {
				if (!isVarNameToken(token)) {
					throw new Error("Expected a parameter name, but '"+token.value+"' found.");
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

		if (token.value === "extends") {
			// inheritance
			advance("extends");
			if (!isVarNameToken(token)){
				throw new Error("Expected a function name, but '"+token.value+"' found.");
			}
			funcbody.parent = token.value;
			advance(); // parent name
		} else {
			funcbody.parent = null;
		}

		funcbody.parameters = array_to_list(args);
		advance("{");
		funcbody.body = statements();
		advance("}");
		funcbody.tag = "function_definition";

		if (t.tag === "var_definition") {
			t.value = funcbody;
			return t;
		} else {
			// anonymous function
			return funcbody;
		}
	};

/*===================== VAR DEF ======================= */
	var var_def = function() {
		print("parsing var def. " + token.value);
		var a = [], n, t;
		while (true) {
			n = token;
			if (!isVarNameToken(n)) {
				throw new Error("Expected a valid variable name, but '" + n.value + "' found.");
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
		if (token && token.value === "else") {
			advance("else");
			if (token.value === "if"){
				// else if
				advance("if");
				n.alternative = if_stmt();
			} else {
				// else
				n.alternative = block();
			}
		} else {
			n.alternative = null;
		}
		return n;
	};
	
/*===================== SWITCH ======================= */
	var switch_stmt = function() {
		print("parsing switch.");
		var n = new_node();
		n.tag = "switch";
		n.variable = expression();
		n.default = null;
		var cases = [];
		advance("{");
		/* cases */
		while (token.value != "}") {
			if (token.value === "case") {
				advance("case");
				var case_node = new_node();
				var case_value = [];
				if(!isConstantToken(token)){
					throw new Error("Expected a constant value, but '"+token.value+"' encountered.");
				}
				case_value.push(token.value);
				advance(); // advance value
				while (token.value === ",") {
					advance(",");
					if(!isConstantToken(token)){
					throw new Error("Expected a constant value, but '"+token.value+"' encountered.");
					}
					case_value.push(token.value);
					advance(); // advance value
				}
				case_node.value = array_to_list(case_value);
				advance(":");
				case_node.stmt = statements();
				cases.push(case_node);
			} else if (token.value === "default") {
				advance("default");
				advance(":");
				n.default = statements();
			} else {
				throw new Error("Expected case/default, but '"+token.value+"' encountered.");
			}
			
		}
		advance("}");
		n.cases = array_to_list(cases);
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
		var hasBracket = isOpeningBracketToken(token);
		if (hasBracket) { advance("("); }
		var n = new_node();
		n.tag = "for";
		// variable
		if (!isVarNameToken(token)) {
			throw new Error("Expected a variable name after for, but '"+token.value+"' found.");
		}
		n.variable = new_var_node(token.value, "variable");
		advance();
		// range
		n.range = parse_range();
		// increment
		n.increment = parse_increment();
		if (hasBracket) { advance(")"); }
		n.consequent = block();
		return n;
	};

	var parse_range = function() {
		var range = {};
		advance("in");
		advance("(");
		var first_value = expression();
		if(isClosingBracketToken(token)) {
			range.from = 0;
			range.to = first_value;
		} else {
			range.from = first_value;
			advance(',');
			range.to = expression();
		}
		advance(")");
		return range;
	};

	var parse_increment = function() {
		if (token && token.value !== "by"){
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
		if (!isOpeningBracketToken(token)){
			condition_expression = expression();
		} else {
			advance("(");
			condition_expression = expression();
			advance(")");
		}
		return condition_expression;
	};

/*===================== CONTINUE ======================= */
	var continue_stmt = function() {
		print("parsing continue. "+token.value);
		var n = new_node();
		n.tag = "continue";
		advance(";");
		return n;
	};

/*===================== BREAK ======================= */
	var break_stmt = function() {
		print("parsing break. "+token.value);
		var n = new_node();
		n.tag = "break";
		advance(";");
		return n;
	};

/*===================== FALLTHROUGH ======================= */
	var fallthrough_stmt = function() {
		print("parsing fallthrough. "+token.value);
		var n = new_node();
		n.tag = "fallthrough";
		advance(";");
		return n;
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
	
	function tokenize(source){
		var program_string_without_comments = source.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
		return program_string_without_comments.tokens('=<>!+-*&|/%^*', '=<>&|*+-.');
	}
	
	function loadLibraries(libs, compiled, parse_callback, evaluate_callback) {
		if (is_empty(libs)) {
			var lib_tokens = tokenize(compiled);
			tokens = lib_tokens.concat(tokens);
			//print(tokens)
			try {
				evaluate_callback(parse_callback());
			} catch (error) {
				if (debug) {
					console.error(error);
				} else {
					jqconsole.Write(error.message + '\n', 'console-error');
				}
			}
			return true;
		}
		
		$.ajax({
			url: "library/"+head(libs)+".yjlo",
			dataType: 'text',
			type: 'GET'
		}).done(function(data){
			loadLibraries(tail(libs), compiled+" "+data, parse_callback, evaluate_callback);
		}).fail(function(){
			var err_msg = "Importing '"+head(libs)+"' failed.";
			jqconsole.Write(err_msg + '\n', 'console-error');
			//$("#program-result").append('<p class="output-error">'+err_msg.replace(/\n/g, "<br />")+'</p>');
		});
	}

	function startParsing() {
		print("start parsing.");
		token_nr = 0;
		token = tokens[token_nr];
		next_token = tokens[token_nr+1];
		var syntax_tree = statements();
		
		// Finished parsing, clear output
		// prepare for evaluation output
		//$("#program-result").empty();
		
		if (syntax_tree) {
			return syntax_tree;
		} else {
			throw new Error("Invalid source code.");
		}
		
	}

	return function (source, evaluate_callback) {
		tokens = tokenize(source);
		
		if (!tokens || tokens.length === 0) {
			throw new Error("Empty source code.");
		}
		
		/* parse import */
		token_nr = 0;
		token = tokens[token_nr];
		var libs = list(); //list("Stack", "LinkedList");
		while (token.value === "import") {
			advance();
			if (token && isVarNameToken(token)) {
				libs = pair(token.value, libs);
				advance(); // library name
				advance(";");
			} else {
				throw new Error("Invalid library '"+token.value()+"'.");
			}
		}
		tokens = tokens.slice(token_nr);
		loadLibraries(libs, "", startParsing, evaluate_callback);
	};
};