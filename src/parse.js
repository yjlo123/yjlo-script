/**
 * YJLO Parser
 * Liu Siwei (liusiwei.yjlo@gmail.com)
 * liusiwei.com
 */

(function(mod) {
	if (typeof exports == 'object' && typeof module == 'object') // CommonJS
		module.exports = mod();
	else if (typeof define == 'function' && define.amd) // AMD
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
		
		let sugar_processor = null;
		
		const reservedKeywords = ['var', 'func', 'import', 'class',
		'if', 'else', 'switch', 'fallthrough', 'case', 'default',
		'continue', 'break', 'while', 'do', 'for', 'in', 'by', 'return'];

		const reservedValues = ['true', 'false', 'null'];

		var isConstantToken = t => t && (t.type === 'string' || t.type === 'number');

		var isVarNameToken = function (t) {
			if (reservedKeywords.indexOf(t.value) != -1){
				return false;
			}
			return t.type === 'name';
		};

		var isNameToken = t => t && t.type === 'name';
		var isNameTokenWithValue = (t, v) => isNameToken(t) && t.value === v;
		var isFuncToken = t => isNameTokenWithValue(t, 'func') || isNameTokenWithValue(t, 'class');
		var isOperatorToken = t => t && t.type === 'operator';
		var isOperatorTokenWithValue = (t, v) => isOperatorToken(t) && t.value === v;
		var isOpeningBracketToken = t => isOperatorTokenWithValue(t, '(');
		var isClosingBracketToken = t => isOperatorTokenWithValue(t, ')');
		var isBracketToken = t => t && (isOpeningBracketToken(t) || isClosingBracketToken(t));
		var isNonBracketOperatorToken = t => isOperatorToken(t) && !isBracketToken(t);
		var isNewLineToken = t => t && t.type === 'newline';
		
		var throwError = function (token, message) {
			throw new Error((token?`[line ${token.line}] `:'') + message);
		};
		
		var throwTokenError = function (expect, token) {
			let tokenValue = token.value;
			throwError(token, `Expected ${expect}. But ${tokenValue==='\n'?'newline':tokenValue} found.`);
		};

		var precedence = function(operator) {
			switch(operator){
			case '[':
			case '.': // reference
				return 15;
			case '**': // power
				return 14;
			case '_-': // negative
			case '_!': // not
			case '_~':
			case '++':	// ++i
			case '_++':	// i++
			case '--':	// --i
			case '_--':	// i--
				return 13;
			case '*':
			case '/':
			case '/.':
			case '%':
				return 12;
			case '+':
			case '-':
				return 11;
			case '<<':
			case '>>':
			case '>>>':
				return 10;
			case '<':
			case '<=':
			case '>':
			case '>=':
				return 9;
			case '==':
			case '!=':
				return 8;
			case '&':
				return 7;
			case '^':
				return 6;
			case '|':
				return 5;
			case '&&':
				return 4;
			case '||':
				return 3;
			case '?':
			case ':':
				return 2;
			case ',':
				return 1;
			case '=': // assignment
			case ':=':
				return 0;
			default:
				return -1;
			}
		};

		var advance = function (value) {
			ignoreNewline();
			
			if (value && !checkToken(value)) {
				throwTokenError(value, token);
			}
			token_nr = token_nr + 1;
			token = tokens[token_nr];
			next_token = (token_nr + 1) < tokens.length ? tokens[token_nr + 1] : null;
			return token;
		};
		
		var checkToken = function(value) {
			ignoreNewline();
			return token && token.value === value;
		};
		
		var advanceOptional = function(value) {
			if (checkToken(value)) {
				advance(value);
			}
		};
		
		var ignoreNewline = function() {
			if (token_nr >= tokens.length) {
				token = null;
				return;
			}
			if (token.type === 'newline') {
				skipToken();
			}
		};
		
		var skipToken = function() {
			token_nr = token_nr + 1;
			token = tokens[token_nr];
			next_token = (token_nr + 1) < tokens.length ? tokens[token_nr + 1] : null;
		};

	/*===================== EXPRESSION ======================= */
		var expression = function () {
			log('parsing expression: '+token.value);
			
			let prev_token;
			let left_node;
			let expression_nodes_infix = [];
			let bracket_count = 0;
			
			// read in the tokens in this expression
			while (token) {
				if (isNewLineToken(token)) {
					skipToken();
					if (bracket_count > 0) {
						continue;
					}
					if (prev_token && isNonBracketOperatorToken(prev_token)) {
						// last line ends with an operator
						if (prev_token.value === '++' || prev_token.value === '--') {
							break;
						}
						continue;
					}
					if (token && isNonBracketOperatorToken(token)) {
						if (checkToken('++') || checkToken('--')) {
							break;
						}
					} else {
						break;
					}
				}
				
				prev_token = token;
				
				if (isOperatorTokenWithValue(token, ',') && bracket_count === 0) {
					// comma as arguments delimiter in function call
					break;
				}
				if (isOperatorToken(token) && /^[;{}]$/.test(token.value)) {
					// ; or { or }
					break;
				}
				if (isOperatorToken(token) && /^\.\.[\.<>]$/.test(token.value)) {
					// ... or ..< or ..>
					// TODO parse range
					break;
				}
				if (isNameToken(token) && !isFuncToken(token) &&
						reservedKeywords.indexOf(token.value) !== -1) {
					// keyword: 'by', 'in'
					break;
				}
				if (isClosingBracketToken(token) && bracket_count === 0) {
					// end of current expression
					break;
				}

				// count brackets
				if (isOpeningBracketToken(token)) { bracket_count += 1; }
				if (isClosingBracketToken(token)) { bracket_count -= 1; }
				
				// process tokens
				if (isNameToken(token) && isFuncToken(token)) {
					let is_class = token.value === 'class';
					// function expression, should be anonymous
					advance(); // func or class
					// ignore given name
					if (isVarNameToken(token)) {
						advance();
					}
					expression_nodes_infix.push(func(is_class));
					continue;
				} else if (isVarNameToken(token) && isOpeningBracketToken(next_token)) {
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
					left_node = new VariableNode(token.value, 'variable', token.line);
				} else if (isOperatorToken(token)) {
					// operator
					left_node = new VariableNode(token.value, 'operator', token.line);
				} else {
					throwTokenError('expression', token);
				}
				
				// push and advance for all single token
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
				return new VariableNode('null', 'variable', token.line);
			}
			
			// convert in-fix order to post-fix order
			let expression_nodes_postfix = [];
			let temp_stack = [];
			for (let i = 0; i < expression_nodes_infix.length; i++) {
				let prevNode = i > 0 ? expression_nodes_infix[i - 1] : null;
				let thisNode = expression_nodes_infix[i];
				if (thisNode.name === '(') {
					temp_stack.push(thisNode);
				} else if (thisNode.type === 'variable' ||
						thisNode instanceof ApplicationNode ||
						thisNode instanceof FuncDefNode) {
					expression_nodes_postfix.push(thisNode);
				} else if (thisNode.tag === 'constant') {
					expression_nodes_postfix.push(thisNode.value);
				} else if (thisNode.name === ')') {
					while (temp_stack.length > 0 && temp_stack[temp_stack.length - 1].name !== '(') {
						expression_nodes_postfix.push(temp_stack.pop());
					}
					if (temp_stack.length > 0) {
						temp_stack.pop(); // pop '('
					} else {
						throwError(token, 'Unmatched bracket');
					}
				} else {
					// operators
					/* prefix all unary operators with '_' ! */
					if (thisNode.name === '-' &&
							(expression_nodes_postfix.length === 0 ||
							(prevNode && /^([\(=]|:=|[=><!]=|\?)$/.test(prevNode.name)))) {
						// ( , = , :=
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
							if ((thisNode.name === '=' && temp_stack[temp_stack.length - 1].name === '=') ||
								(thisNode.name === ':=' && temp_stack[temp_stack.length - 1].name === ':=')) {
								// '=' is right association
								break;
							}
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
						let operator = '';
						if (compound_assign) {
							right = tree_stack.pop();
							operator = exp_node.name.slice(0, -1);
						} else {
							right = 1;
							operator = exp_node.name.charAt(1); // + or -
						}
						let left = tree_stack.pop();
						
						let apply_node = new ApplicationNode(exp_node.line);
						apply_node.setOperator(new VariableNode(operator, 'operator', exp_node.line));
						apply_node.setOperands(_array_to_list([left, right]));
						
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
					} else if (exp_node.name === ':=') {
						let var_node = new VarDefNode(exp_node.line);
						var_node.setRight(tree_stack.pop());
						var_node.setLeft(tree_stack.pop().name);
						tree_stack.push(var_node);
					} else {
						let operands = [];
						
						if (exp_node.name === '?') {
							// ternary operator, wait for one more operand
							continue;
						}
						
						operands.unshift(tree_stack.pop());
						if (exp_node.name.charAt(0) !== '_'){
							// not a unary operator
							operands.unshift(tree_stack.pop());
						}
						
						if (exp_node.name === ':') {
							// ternary operator, pop third operand
							operands.unshift(tree_stack.pop());
						}
						let apply_node = new ApplicationNode(exp_node.line);
						apply_node.setOperator(exp_node);
						apply_node.setOperands(_array_to_list(operands));
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
			let stmt_tree;
			ignoreNewline();
			switch (token.value){
				case ';':
					advance();
					break;
				case 'var':
					advance();
					stmt_tree = var_def();
					break;
				case 'func':
					advance();
					stmt_tree = func(false);
					break;
				case 'class':
					advance();
					stmt_tree = func(true);
					break;
				case 'if':
					advance();
					stmt_tree = if_stmt();
					break;
				case 'switch':
					advance();
					stmt_tree = switch_stmt();
					break;
				case 'while':
					advance();
					stmt_tree = while_stmt();
					break;
				case 'do':
					advance();
					stmt_tree = do_while_stmt();
					break;
				case 'for':
					advance();
					stmt_tree = for_stmt();
					break;
				case 'continue':
					advance();
					stmt_tree = continue_stmt();
					break;
				case 'break':
					advance();
					stmt_tree = break_stmt();
					break;
				case 'return':
					advance();
					stmt_tree = return_stmt();
					break;
				case 'fallthrough':
					advance();
					stmt_tree = fallthrough_stmt();
					break;
				default:
					stmt_tree = expression();
			}
			advanceOptional(';');
			return stmt_tree;
		};

	/*===================== STATEMENTS ======================= */
		var statements = function () {
			log('parsing statements.');
			var stmts = [],
				stmt;
			while (true) {
				ignoreNewline();
				// TODO check if is operator or string
				if (token_nr === tokens.length ||
					checkToken('}') ||
					checkToken('case') ||
					checkToken('default')) {
					log('end of statement list');
					break;
				}
				stmt = statement();
				if (stmt) {
					stmts.push(stmt);
				}
			}
			return stmts.length === 0 ? null : _array_to_list(stmts);
		};

	/*===================== FUNC CALL ======================= */
		var func_call = function(t) {
			log('parsing func call. '+t.value);
			let apply_node = new ApplicationNode(t.line);
			apply_node.setOperator(new VariableNode(t.value, 'variable', t.line));
			var operands = [];
			advance('(');
			ignoreNewline();
			while (!isClosingBracketToken(token)) {
				operands.push(expression());
				if (isClosingBracketToken(token)) {
					break;
				}
				advance(',');
				ignoreNewline();
			}
			advance(')');
			apply_node.setOperands(_array_to_list(operands));
			return apply_node;
		};

	/*===================== RETURN ======================= */
		var return_stmt = function() {
			log('parsing return. '+token.value);
			let node = new ReturnNode(token.line, expression());
			advanceOptional(';');
			return node;
		};
		
	/*===================== FUNC ======================= */
		var func = function(is_class) {
			log('parsing function. '+token.value);
			let args = [];
			let node = null;
			let func_name = '';
			if (isVarNameToken(token)) {
				func_name = token.value;
				node = new VarDefNode(token.line);
				node.setLeft(token.value);
				advance(); // func name
			} else if (isOpeningBracketToken(token)) {
				// anonymous function
			} else {
				throwError(token, 'Invalid function name.');
			}

			advance('(');
			if (!isClosingBracketToken(token)) {
				while (true) {
					if (!isVarNameToken(token)) {
						throwTokenError('a variable name', token);
					}
					args.push(token.value);
					advance();
					if (!checkToken(',')) {
						break;
					}
					advance(',');
				}
			}
			advance(')');
			
			let parents = [];
			if (checkToken('extends')) {
				// inheritance
				advance('extends');
				
				while (true) {
					if (!isVarNameToken(token)){
						throwTokenError('a variable name', token);
					}
					parents.push(token.value);
					advance(); // parent name
					if (!checkToken(',')) {
						break;
					}
					advance(',');
				}
			}
			
			let funcbody = new FuncDefNode(token.line);
			funcbody.setName(func_name);
			funcbody.setParent(_array_to_list(parents));
			funcbody.setParameters(_array_to_list(args));
			advance('{');
			funcbody.setBody(statements());
			advance('}');
			
			if (is_class) {
				funcbody.setClass();
			}
			
			if (node) {
				node.setRight(funcbody);
				return node;
			} else {
				// anonymous function
				return funcbody;
			}
		};

	/*===================== VAR DEF ======================= */
		var var_def = function() {
			log('parsing var def. ' + token.value);
			var var_arr = [], n;
			let node = null;
			while (token) {
				n = token;
				if (!isVarNameToken(n)) {
					throwTokenError('a variable name', token);
				}
				advance(); // var name
				
				node = new VarDefNode(n.line);
				node.setLeft(n.value);
				if (checkToken('=')) {
					advance('=');
					node.setRight(expression());
					var_arr.push(node);
				} else {
					// default initial value
					node.setRight(new VariableNode('null', 'variable', n.line));
					var_arr.push(node);
				}
				if (!checkToken(',')) {
					break;
				}
				advance(',');
				ignoreNewline();
			}
			advanceOptional(';');
			return _array_to_list(var_arr);
		};

	/*===================== IF ======================= */
		var if_stmt = function() {
			log('parsing if.');
			let node = new IfNode(token.line);
			node.setPredicate(condition());
			node.setConsequent(block());
			if (checkToken('else')) {
				advance('else');
				if (checkToken('if')) {
					// else if
					advance('if');
					node.setAlternative(if_stmt());
				} else {
					// else
					node.setAlternative(block());
				}
			} else {
				node.setAlternative(null);
			}
			return node;
		};
		
	/*===================== SWITCH ======================= */
		var switch_stmt = function () {
			log('parsing switch.');
			let node = new SwitchNode(token.line);
			node.setVariable(expression());
			node.setDefault(null);
			let cases = [];
			advance('{');
			/* cases */
			while (!checkToken('}')) {
				if (checkToken('case')) {
					advance('case');
					let case_node = new CaseNode(token.line);
					let case_value = [];
					if (!isConstantToken(token)) {
						throwTokenError('a constant value', token);
					}
					case_value.push(token.value);
					advance(); // advance value
					while (checkToken(',')) {
						advance(',');
						if (!isConstantToken(token)) {
							throwTokenError('a constant value', token);
						}
						case_value.push(token.value);
						advance(); // advance value
					}
					case_node.setValue(_array_to_list(case_value));
					advance(':');
					case_node.setStmt(statements());
					cases.push(case_node);
				} else if (checkToken('default')) {
					advance('default');
					advance(':');
					node.setDefault(statements());
				} else {
					throwTokenError('"case" or "default"', token);
				}

			}
			advance('}');
			node.setCases(_array_to_list(cases));
			return node;
		};
	
	/*===================== WHILE ======================= */
		var while_stmt = function () {
			log('parsing while.');
			let node = new WhileNode(token.line);
			node.setPredicate(condition());
			node.setConsequent(block());
			return node;
		};

	/*===================== DO WHILE ======================= */
		var do_while_stmt = function () {
			log('parsing do.');
			let node = new DoWhileNode(token.line);
			node.setConsequent(block());
			advance('while');
			node.setPredicate(condition());
			advanceOptional(';');
			return node;
		};

	/*===================== FOR ======================= */
		var for_stmt = function () {
			log('parsing for.');
			var hasBracket = isOpeningBracketToken(token);
			if (hasBracket) advance('(');
			let node = new ForNode(token.line);
			// variable
			if (!isVarNameToken(token)) {
				throwTokenError('a variable name', token);
			}
			node.setVariable(new VariableNode(token.value, 'variable', token.line));
			advance();
			// range
			advance('in');
			node.setRange(parse_range());
			// increment
			node.setIncrement(parse_increment());
			if (hasBracket) advance(')');
			node.setConsequent(block());
			return node;
		};

		var parse_range = function () {
			// TODO parse range in expression()
			let first_value = expression();
			if (checkToken('{')) {
				// list
				return first_value;
			}
			// value range
			let range = new RangeNode(token.line);
			range.setFrom(first_value);
			if (/^\.\.[<>]$/.test(token.value)) {
				// ..< or ..>
				advance();
			} else {
				advance('...');
				range.setClosed();
			}
			range.setTo(expression());
			return range;
		};

		var parse_increment = function () {
			if (!checkToken('by')) {
				return null;
			}
			advance('by');
			return expression();
		};

	/*===================== BLOCK ======================= */
		var block = function () {
			var block_stmts = null;
			if (!checkToken('{')) {
				// single statement block
				block_stmts = _array_to_list([statement()]);
			} else {
				advance('{');
				block_stmts = statements();
				advance('}');
			}
			return block_stmts;
		};

	/*===================== CONDITION ======================= */
		var condition = function () {
			return expression();
		};

	/*===================== CONTINUE ======================= */
		var continue_stmt = function () {
			log('parsing continue. ' + token.value);
			let node = new ContinueNode(token.line);
			advanceOptional(';');
			return node;
		};

	/*===================== BREAK ======================= */
		var break_stmt = function () {
			log('parsing break. ' + token.value);
			let node = new BreakNode(token.line);
			advanceOptional(';');
			return node;
		};

	/*===================== FALLTHROUGH ======================= */
		var fallthrough_stmt = function () {
			log('parsing fallthrough. ' + token.value);
			let node = new FallthroughNode(token.line);
			advanceOptional(';');
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
				// TODO pass in stdout from caller
				$('#processing-source-icon').hide();
				jqconsole.Write(error.message + '\n', 'console-error');
			}
		}

	/* ============= end of helper functions =========== */

		var newSourceObj = function(name) {
			var obj = {};
			obj.name = name; // string
			obj.tokens = []; // array
			obj.dependency = null; // list
			return obj;
		};
		
		var processSource = function(source, name) {
			tokens = this.sugar_processor(source);
			if (!tokens || tokens.length === 0) {
				throwError(null, 'Empty source code.');
			}
			var thisSourceObj = newSourceObj(name);
			
			// parse imports
			token_nr = 0;
			token = tokens[token_nr];
			var libs = _list();
			while (checkToken('import')) {
				advance('import');
				if (token && isVarNameToken(token)) {
					let libPath = token.value;
					advance(); // library name
					if (checkToken('from')) {
						advance('from');
						if (token && token.type === 'string') {
							if (CONFIG && token.value in CONFIG.library) {
								configPath = CONFIG.library[token.value];
								libPath = configPath + (configPath.slice(-1)==='/'?'':'/') + libPath;
							} else {
								libPath = token.value + (token.value.slice(-1)==='/'?'':'/') + libPath;
							}
							advance(); // path
						} else {
							throwError(null, 'Invalid library path for "' + libPath + '".');
						}
					}
					libs = _pair(libPath, libs);
					advanceOptional(';');
				} else {
					throwError(null, 'Invalid library "'+token.value()+'".');
				}
			}
			thisSourceObj.dependency = libs;
			thisSourceObj.tokens = tokens.slice(token_nr);
			return thisSourceObj;
		};
		
		var startParsing = function() {
			log('start parsing.');
			
			token_nr = 0;
			token = tokens[token_nr];
			next_token = tokens[token_nr+1];
			var syntax_tree = statements();
			
			// Finished parsing
			if (syntax_tree) {
				return syntax_tree;
			} else {
				throwError(null, 'Invalid source code.');
			}
		};
		
		var loadSources = function(evaluate_callback) {
			var nextSourceName = _head(loadingQueue);
			
			let libPath = (nextSourceName.indexOf('/')===-1 ? 'library/' : '') + nextSourceName + '.yjlo';
			$.ajax({
				url: libPath,
				dataType: 'text',
				type: 'GET'
			}).done(function(data){
				if (_is_empty(loadingQueue)) {
					return;
				}
				loadingQueue = _tail(loadingQueue);
				var thisSourceObj = processSource(data, nextSourceName);
				sources.push(thisSourceObj);
				
				// add new dependencies to queue
				var newDependency = thisSourceObj.dependency;
				while (!_is_empty(newDependency)) {
					loadingQueue = _pair(_head(newDependency), loadingQueue);
					newDependency = _tail(newDependency);
				}
				
				if(!_is_empty(loadingQueue)){
					// load next
					loadSources(evaluate_callback);
				}else{
					// finished all loading
					tokens = resolveDependency(sources);
					try {
						evaluate_callback(startParsing());
					} catch (error) {
						outputError(error);
					}
				}
			}).fail(function(){
				try {
					throwError(null, 'Importing "' + nextSourceName + '" failed.');
				} catch (error) {
					outputError(error);
				}
			});
		};
		
		return function (source, parsed_callback, sugar_processor, import_lib=true) {
			this.sugar_processor = sugar_processor;
			
			// current source code is identified as 'self'
			var selfSourceObj = processSource(source, 'self');
			tokens = selfSourceObj.tokens;
			//console.log(tokens);
			
			sources = [];
			loadingQueue = _list();
			loadingQueue = selfSourceObj.dependency;
			sources.push(selfSourceObj);
			
			if (_length(loadingQueue) === 0 || !import_lib) {
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

	Parser.version = '1.0';
	return Parser;
});