/**
 * YJLO Parser
 * Liu Siwei (liusiwei.yjlo@gmail.com)
 * liusiwei.com
 */

(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
		module.exports = mod();
	else if (typeof define == "function" && define.amd) // AMD
		return define([], mod);
	else // Plain browser env
		(this || window).YjloParser = mod();
})(function() {
	function Parser() {
		var sources;
		var loadingQueue;
		var token;
		var next_token;
		var tokens;
		var token_nr;
		
		const reservedKeywords = ["var", "func", "import",
		"if", "else", "switch", "fallthrough", "case", "default",
		"continue", "break", "while", "do", "for", "in", "by", "return"];

		const reservedValues = ["true", "false", "null"];

		var new_node = function() {
			return {};
		};
		
		class Token {
			constructor(type, value, line) {
				this.type = type;
				this.value = value;
				this.line = line;
			}
		}

		class Node {
			constructor(tag, line) {
				this.tag = tag;
				this.line = line;
			}
		}

		// Includs variable, operator, boolean
		class VariableNode extends Node {
			constructor(name, type, line) {
				super("variable", line);
				this.name = name;
				this.type = type;
			}
		}

		class ConstantNode extends Node {
			constructor(value, line) {
				super("constant", line);
				this.value = value;
			}
		}

		class ApplicationNode extends Node {
			constructor(line) {
				super("application", line);
			}
			setOperator(value) {
				this.operator = value;
			}
			setOperands(value) {
				this.operands = value;
			}
		}
		
		class AssignmentNode extends Node {
			constructor(line) {
				super("assignment", line);
				this.returnLeft = false;
			}
			setLeft(value) {
				this.left = value;
			}
			setRight(value) {
				this.right = value;
			}
			setReturnLeft() {
				this.returnLeft = true;
			}
		}
		
		class ReturnStatementNode extends Node {
			constructor(line, expression) {
				super("return_statement", line);
				this.expression = expression;
			}
		}

		var isConstantToken = t => t && (t.type === "string" || t.type === "number");

		var isVarNameToken = function (t) {
			if (reservedKeywords.indexOf(t.value) != -1){
				return false;
			}
			return t.type === "name";
		};

		var isOperatorToken = t => t && t.type === 'operator';
		var isOpeningBracketToken = t => t && isOperatorToken(t) && t.value === "(";
		var isClosingBracketToken = t => t && isOperatorToken(t) && t.value === ")";
		
		var throwError = function (token, message) {
			throw new Error((token?`[line ${token.line}] `:"") + message);
		};
		
		var throwTokenError = function (expect, token) {
			throwError(token, `Expected ${expect}. But ${token.value} found.`);
		};

		var precedence = function(operator) {
			switch(operator){
			case ".": // reference
				return 14;
			case "**": // power
				return 13;
			case "_-": // negative
			case "_!": // not
			case "_~":
			case "++":	// ++i
			case "_++":	// i++
			case "--":	// --i
			case "_--":	// i--
				return 12;
			case "*":
			case "/":
			case "/.":
			case "%":
				return 11;
			case "+":
			case "-":
				return 10;
			case "<<":
			case ">>":
			case ">>>":
				return 9;
			case "<":
			case "<=":
			case ">":
			case ">=":
				return 8;
			case "==":
			case "!=":
				return 7;
			case "&":
				return 6;
			case "^":
				return 5;
			case "|":
				return 4;
			case "&&":
				return 3;
			case "||":
				return 2;
			case "?":
			case ":":
				return 1;
			case "=": // assignment
				return 0;
			default:
				return -1;
			}
		};

		var advance = function (value) {
			if (token_nr >= tokens.length) {
				token = null;
				return;
			}
			
			if (value && token.value !== value) {
				throwTokenError(value, token);
			}
			token_nr = token_nr + 1;
			token = tokens[token_nr];
			next_token = (token_nr + 1) < tokens.length ? tokens[token_nr + 1] : null;
			return token;
		};

	/*===================== EXPRESSION ======================= */
		var expression = function () {
			log("parsing expression: "+token.value);
			
			let left_node;
			let expression_nodes_infix = [];
			let bracket_count = 0;

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
			while (token && !/^[,;{]$/.test(token.value)) {
				if (isClosingBracketToken(token) && bracket_count === 0) {
					// end of current expression
					break;
				}

				if (isOpeningBracketToken(token)) bracket_count += 1;
				if (isClosingBracketToken(token)) bracket_count -= 1;
				if (isVarNameToken(token) && isOpeningBracketToken(next_token)) {
					// function call in expression
					let func_token = token;
					advance();
					expression_nodes_infix.push(func_call(func_token));
					continue;
				} else if (isConstantToken(token)) {
					// constant
					left_node = new ConstantNode(token.value, token.line);
				} else if (isVarNameToken(token)) {
					// variable
					let is_boolean = (token.value == "true") || (token.value == "false");
					left_node = new VariableNode(token.value, is_boolean ? "boolean" : "variable", token.line);
				} else if (isOperatorToken(token)) {
					// operator
					left_node = new VariableNode(token.value, "operator", token.line);
				} else {
					throwTokenError("expression", token);
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
				return new VariableNode("null", "variable", token.line);
			}
			
			// convert in-fix order to post-fix order
			let expression_nodes_postfix = [];
			let temp_stack = [];
			for (let i = 0; i < expression_nodes_infix.length; i++) {
				let prevNode = i > 0 ? expression_nodes_infix[i - 1] : null;
				let thisNode = expression_nodes_infix[i];
				if (thisNode.name === '(') {
					temp_stack.push(thisNode);
				} else if (thisNode.type === 'variable' || thisNode instanceof ApplicationNode) {
					expression_nodes_postfix.push(thisNode);
				} else if (thisNode.type === 'boolean') {
					expression_nodes_postfix.push(thisNode.name === "true" ? true : false);
				} else if (thisNode.tag === 'constant') {
					expression_nodes_postfix.push(thisNode.value);
				} else if (thisNode.name === ')') {
					while (temp_stack.length > 0 && temp_stack[temp_stack.length - 1].name !== '(') {
						expression_nodes_postfix.push(temp_stack.pop());
					}
					if (temp_stack.length > 0) {
						temp_stack.pop(); // pop '('
					} else {
						throwError(token, "Unmatched bracket");
					}
				} else {
					// operators
					/* prefix all unary operators with '_' ! */
					if (thisNode.name === '-' &&
						(expression_nodes_postfix.length === 0 || (prevNode && prevNode.name === '('))) {
						// negative operator
						thisNode.name = '_-';
					}
					if (thisNode.name === '!' || thisNode.name === '~') {
						thisNode.name = '_' + thisNode.name;
					}
					
					// increment or decrement
					if ((thisNode.name === '++' || thisNode.name === '--')) {
						if (!(expression_nodes_postfix.length === 0 || (prevNode && prevNode.name === '('))) {
							// if not prefix: i++, i--
							thisNode.name = '_' + thisNode.name;
						}
					}
					
					while (temp_stack.length > 0 &&
						precedence(thisNode.name) <= precedence(temp_stack[temp_stack.length - 1].name)) {
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
			let tree_stack = [];
			for (let i = 0; i < expression_nodes_postfix.length; i++) {
				let exp_node = expression_nodes_postfix[i];
				if (exp_node.type === 'operator') {
					
					if (// _++, _--, ++, --
						/^_?(\+\+|--)$/.test(exp_node.name) ||
							// += -= *= /= %= &= |= ^= /.= **= <<= >>= >>>=
							/^([+\-\*\/%&|^]|\*\*|\/\.|[<>]{2}|[>]{3})=$/.test(exp_node.name)) {
						let compound_assign = exp_node.name.charAt(exp_node.name.length-1) === '=';
						let assign_node = new AssignmentNode(exp_node.line);
						let right = null;
						let operator = "";
						if (compound_assign) {
							right = tree_stack.pop();
							operator = exp_node.name.slice(0, -1);
						} else {
							right = 1;
							operator = exp_node.name.charAt(1); // + or -
						}
						let left = tree_stack.pop();
						
						let apply_node = new ApplicationNode(exp_node.line);
						apply_node.setOperator(new VariableNode(operator, "operator", exp_node.line));
						apply_node.setOperands(array_to_list([left, right]));
						
						assign_node.setLeft(left);
						assign_node.setRight(apply_node);
						if (exp_node.name.charAt(0) === '_') {
							assign_node.setReturnLeft();
						}
						tree_stack.push(assign_node);
					} else if (exp_node.name === '=') {
						let assign_node = new AssignmentNode(exp_node.line);
						assign_node.setRight(tree_stack.pop());
						assign_node.setLeft(tree_stack.pop());
						tree_stack.push(assign_node);
					} else {
						let operands = [];
						
						if (exp_node.name === "?") {
							// ternary operator, wait for one more operand
							continue;
						}
						
						operands.unshift(tree_stack.pop());
						if (exp_node.name.charAt(0) !== '_'){
							// not a unary operator
							operands.unshift(tree_stack.pop());
						}
						
						if (exp_node.name === ":") {
							// ternary operator, pop third operand
							operands.unshift(tree_stack.pop());
						}
						let apply_node = new ApplicationNode(exp_node.line);
						apply_node.setOperator(exp_node);
						apply_node.setOperands(array_to_list(operands));
						tree_stack.push(apply_node);
					}
				} else {
					tree_stack.push(exp_node);
				}
			}
			return tree_stack[0];
		};

	/*===================== STATEMENT ======================= */
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
			}
			return v;
		};

	/*===================== STATEMENTS ======================= */
		var statements = function () {
			log("parsing statements.");
			var stmts = [],
				stmt;
			while (true) {
				if (token_nr === tokens.length ||
					token.value === '}' ||
					token.value === 'case' ||
					token.value === 'default') {
					log("end of statement list");
					break;
				}
				stmt = statement();

				if (stmt) {
					stmts.push(stmt);
				}
			}
			return stmts.length === 0 ? null : array_to_list(stmts);
		};

	/*===================== FUNC CALL ======================= */
		var func_call = function(t) {
			log("parsing func call. "+t.value);
			let apply_node = new ApplicationNode(t.line);
			apply_node.setOperator(new VariableNode(t.value, "variable", t.line));
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
			apply_node.setOperands(array_to_list(operands));
			return apply_node;
		};

	/*===================== RETURN ======================= */
		var return_stmt = function() {
			log("parsing return. "+token.value);
			let node = new ReturnStatementNode(token.line, expression());
			advance(";");
			return node;
		};

	/*===================== FUNC ======================= */
		var func = function() {
			log("parsing function. "+token.value);
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
				throwError(token, "Invalid function name.");
			}

			advance("(");
			if (!isClosingBracketToken(token)) {
				while (true) {
					if (!isVarNameToken(token)) {
						throwTokenError("a variable name", token);
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
					throwTokenError("a variable name", token);
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
			log("parsing var def. " + token.value);
			var a = [], n, t;
			while (token) {
				n = token;
				if (!isVarNameToken(n)) {
					throwTokenError("a variable name", token);
				}
				advance(); // var name
				t = new_node();
				t.tag = "var_definition";
				t.line = n.line;
				t.variable = n.value;
				if (token && token.value === "=") {
					advance("=");
					t.value = expression();
					a.push(t);
				} else {
					// default initial value
					t.value = new VariableNode("null", "variable", n.line);
					a.push(t);
				}
				if (token && token.value !== ",") {
					break;
				}
				advance(",");
			}
			advance(";");
			return array_to_list(a);
		};

	/*===================== IF ======================= */
		var if_stmt = function() {
			log("parsing if.");
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
		var switch_stmt = function () {
			log("parsing switch.");
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
					case_node.tag = "case";
					var case_value = [];
					if (!isConstantToken(token)) {
						throwTokenError("a constant value", token);
					}
					case_value.push(token.value);
					advance(); // advance value
					while (token.value === ",") {
						advance(",");
						if (!isConstantToken(token)) {
							throwTokenError("a constant value", token);
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
					throwTokenError("'case' or 'default'", token);
				}

			}
			advance("}");
			n.cases = array_to_list(cases);
			return n;
		};

	/*===================== WHILE ======================= */
		var while_stmt = function () {
			log("parsing while.");
			var n = new_node();
			n.tag = "while";
			n.predicate = condition();
			n.consequent = block();
			return n;
		};

	/*===================== DO WHILE ======================= */
		var do_while_stmt = function () {
			log("parsing do.");
			var n = new_node();
			n.tag = "do";
			n.consequent = block();
			advance("while");
			n.predicate = condition();
			advance(";");
			return n;
		};

	/*===================== FOR ======================= */
		var for_stmt = function () {
			log("parsing for.");
			var hasBracket = isOpeningBracketToken(token);
			if (hasBracket) advance("(");
			var n = new_node();
			n.tag = "for";
			n.line = token.line;
			// variable
			if (!isVarNameToken(token)) {
				throwTokenError("a variable name", token);
			}
			n.variable = new VariableNode(token.value, "variable", token.line);
			advance();
			// range
			n.range = parse_range();
			// increment
			n.increment = parse_increment();
			if (hasBracket) advance(")");
			n.consequent = block();
			return n;
		};

		var parse_range = function () {
			var range = {};
			advance("in");
			advance("(");
			var first_value = expression();
			if (isClosingBracketToken(token)) {
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

		var parse_increment = function () {
			if (token && token.value !== "by") {
				return null;
			}
			advance("by");
			return expression();
		};

	/*===================== BLOCK ======================= */
		var block = function () {
			var block_stmts = null;
			if (token.value !== '{') {
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
		var condition = function () {
			var condition_expression = null;
			if (!isOpeningBracketToken(token)) {
				condition_expression = expression();
			} else {
				advance("(");
				condition_expression = expression();
				advance(")");
			}
			return condition_expression;
		};

	/*===================== CONTINUE ======================= */
		var continue_stmt = function () {
			log("parsing continue. " + token.value);
			let node = new Node("continue", token.line);
			advance(";");
			return node;
		};

	/*===================== BREAK ======================= */
		var break_stmt = function () {
			log("parsing break. " + token.value);
			let node = new Node("break", token.line);
			advance(";");
			return node;
		};

	/*===================== FALLTHROUGH ======================= */
		var fallthrough_stmt = function () {
			log("parsing fallthrough. " + token.value);
			let node = new Node("fallthrough", token.line);
			advance(";");
			return node;
		};

	/* ================= helper functions ============ */
		function log(msg) {
			if (debug) {
				console.log(msg);
			}
		}

		function outputError(error) {
			if (debug) {
				console.error(error);
			} else {
				jqconsole.Write(error.message + '\n', 'console-error');
			}
		}

		function array_to_list(arr) {
			let lst = list();
			for (let i = arr.length - 1; i >= 0; i--) {
				lst = pair(arr[i], lst);
			}
			return lst;
		}
	/* ============= end of helper functions =========== */

		function tokenizeAndDesugaring(source){
			// var program_string_without_comments 
			// = source.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
			let original_tokens = source.tokens('=<>!+-*&|/%^*', '=<>&|*+-.');
			let desugared_tokens = [];
			
			// desugaring
			let brace_count = 0;
			let class_level = 0;
			let class_arg_positions = list();
			let class_constructor = false;
			let class_constructor_arg_tokens = [];
			for (let i = 0; i < original_tokens.length; i++) {
				let t = original_tokens[i];
				if (t.type !== "operator" && t.type !== "name") {
					desugared_tokens.push(t);
					continue;
				}
				switch (t.value) {
					case '[':
						desugared_tokens.push(new Token('name', '$list', t.line));
						desugared_tokens.push(new Token('operator', '(', t.line));
						break;
					case ']':
						desugared_tokens.push(new Token('operator', ')', t.line));
						break;
					case 'class':
						desugared_tokens.push(new Token('name', 'func', t.line));
						i++;
						t = original_tokens[i];
						desugared_tokens.push(t); // class name
						desugared_tokens.push(new Token('operator', '(', t.line));
						class_arg_positions = pair(desugared_tokens.length, class_arg_positions);
						desugared_tokens.push(new Token('operator', ')', t.line));
						class_level++;
						break;
					case '@':
						// constructor
						if (class_level > 0 && brace_count === class_level) {
							if (is_empty(class_arg_positions)){
								throwError(t, "Invalid constructor position.");
							}
							desugared_tokens.push(new Token('name', 'func', t.line));
							desugared_tokens.push(t); // "@"
							i++;
							t = original_tokens[i];
							desugared_tokens.push(t); // "("
							let position = head(class_arg_positions);
							i++;
							t = original_tokens[i];
							class_constructor_arg_tokens = [];
							while (t.value !== ")") {
								
								desugared_tokens.push(t);
								let trans_token;
								if (t.type === "name") {
									// prepend @ to argument name
									// to prevent conflict with other vars in the class
									trans_token = new Token('name', '@' + t.value, t.line);
								} else {
									trans_token = t;
								}
								
								desugared_tokens.splice(position++, 0, trans_token);
								class_constructor_arg_tokens.push(trans_token);
								i++;
								t = original_tokens[i];
							}
							desugared_tokens.push(t); // ")"
							class_constructor = true;
						} else {
							// other usage of '@'
							desugared_tokens.push(t);
						}
						break;
					case '{':
						desugared_tokens.push(t);
						brace_count++;
						break;
					case '}':
						if (class_level > 0 && brace_count === class_level) {
							// end of class
							desugared_tokens.push(new Token('name', 'return', t.line));
							desugared_tokens.push(new Token('name', 'func', t.line));
							desugared_tokens.push(new Token('operator', '(', t.line));
							desugared_tokens.push(new Token('operator', ')', t.line));
							desugared_tokens.push(new Token('operator', '{', t.line));
							desugared_tokens.push(new Token('operator', '}', t.line));
							desugared_tokens.push(new Token('operator', ';', t.line));
							desugared_tokens.push(t);
							class_level--;
							class_arg_positions = tail(class_arg_positions);
						} else if(class_level > 0 && class_constructor && brace_count === class_level+1) {
							// end of constructor
							desugared_tokens.push(t); // "}"
							desugared_tokens.push(new Token('name', '@', t.line));
							desugared_tokens.push(new Token('operator', '(', t.line));
							desugared_tokens = desugared_tokens.concat(class_constructor_arg_tokens);
							desugared_tokens.push(new Token('operator', ')', t.line));
							desugared_tokens.push(new Token('operator', ';', t.line));
							class_constructor = false;
						} else {
							desugared_tokens.push(t);
						}
						brace_count--;
						break;
					default:
						if (t.type === "name" && t.value && t.value.length > 0) {
							let firstChar = t.value.charAt(0);
							if (firstChar === "@") {
								// prevent defining system generated variables
								throwError(t, "Invalid variable name: " + t.value);
							}
						}
						desugared_tokens.push(t);
				}
			}
			return desugared_tokens;
		}

		var newSourceObj = function(name) {
			var obj = {};
			obj.name = name; // string
			obj.tokens = []; // array
			obj.dependency = null; // list
			return obj;
		};
		
		var processSource = function(source, name) {
			tokens = tokenizeAndDesugaring(source);
			if (!tokens || tokens.length === 0) {
				throwError(null, "Empty source code.");
			}
			var thisSourceObj = newSourceObj(name);
			
			// parse imports
			token_nr = 0;
			token = tokens[token_nr];
			var libs = list();
			while (token && token.value === "import") {
				advance();
				if (token && isVarNameToken(token)) {
					libs = pair(token.value, libs);
					advance(); // library name
					advance(";");
				} else {
					throwError(null, "Invalid library '"+token.value()+"'.");
				}
			}
			thisSourceObj.dependency = libs;
			thisSourceObj.tokens = tokens.slice(token_nr);
			return thisSourceObj;
		};
		
		var startParsing = function() {
			log("start parsing.");
			
			token_nr = 0;
			token = tokens[token_nr];
			next_token = tokens[token_nr+1];
			var syntax_tree = statements();
			
			// Finished parsing
			if (syntax_tree) {
				return syntax_tree;
			} else {
				throwError(null, "Invalid source code.");
			}
		};
		
		var loadSources = function(evaluate_callback) {
			var nextSourceName = head(loadingQueue);
			
			$.ajax({
				url: "library/" + nextSourceName + ".yjlo",
				dataType: 'text',
				type: 'GET'
			}).done(function(data){
				if (is_empty(loadingQueue)) {
					return;
				}
				loadingQueue = tail(loadingQueue);
				var thisSourceObj = processSource(data, nextSourceName);
				sources.push(thisSourceObj);
				
				// add new dependencies to queue
				var newDependency = thisSourceObj.dependency;
				while (!is_empty(newDependency)) {
					loadingQueue = pair(head(newDependency), loadingQueue);
					newDependency = tail(newDependency);
				}
				
				if(!is_empty(loadingQueue)){
					// load next
					loadSources(evaluate_callback);
				}else{
					// finished all loading
					tokens = resolveDependency();
					try {
						evaluate_callback(startParsing());
					} catch (error) {
						outputError(error);
					}
				}
			}).fail(function(){
				try {
					throwError(null, "Importing '" + nextSourceName + "' failed.");
				} catch (error) {
						outputError(error);
				}
			});
		};
		
		/* Resolve dependencies in sources
		* return concatenated tokens
		*/
		var resolveDependency = function() {
			var dependencyNode = function(data) {
				this.data = data;
				this.dependency = [];
			};
			
			// build dependency graph
			var dependencyGraph = {};
			sources.forEach(function(source){
				if (!dependencyGraph.hasOwnProperty(source.name)){
					dependencyGraph[source.name] = new dependencyNode(source);
					dependencyGraph[source.name].dependency = source.dependency;
				}
			});
			
			var resolve = function (node, unresolved){
				unresolved.push(node);
				var dependencies = dependencyGraph[node].dependency;
				while (!is_empty(dependencies)) {
					var edge = head(dependencies);
					if (resolved.indexOf(edge) === -1) {
						if (unresolved.indexOf(edge) !== -1) {
							throwError(null, 'Circular dependency detected: '+node+' -> '+edge);
						}
						resolve(edge, unresolved);
					}
					dependencies = tail(dependencies);
				}
				resolved.push(node);
				// remove from unresolved
				var index = unresolved.indexOf(node);
				if (index > -1) {
					unresolved.splice(index, 1);
				}
			};
			var resolved = [];
			resolve("self", []);

			var resolvedTokens = [];
			for (let i in resolved){
				// append source tokens
				resolvedTokens = resolvedTokens.concat(dependencyGraph[resolved[i]].data.tokens);
			}
			return resolvedTokens;
		};

		return function (source, parsed_callback, import_lib=true) {
			// current source code is identified as "self"
			var selfSourceObj = processSource(source, "self");
			tokens = selfSourceObj.tokens;
			
			sources = [];
			loadingQueue = list();
			loadingQueue = selfSourceObj.dependency;
			sources.push(selfSourceObj);
			
			if (length(loadingQueue) === 0 || !import_lib) {
				// no library imported
				try {
					parsed_callback(startParsing());
				} catch (error) {
					outputError(error);
				}
			} else {
				// load libraries and evaluate
				loadSources(parsed_callback);
			}
		};
	}

	Parser.version = "1.0";
	return Parser;
});