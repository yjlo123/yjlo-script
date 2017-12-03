function tokenizeAndDesugaring(source){
	
	/* Temp copied from parse.js */
	var isVarNameToken = function (t) {
		if (reservedKeywords.indexOf(t.value) != -1){
			return false;
		}
		return t.type === 'name';
	};
	var isStringToken = t => t && t.type === 'string';
	var isOperatorToken = t => t && t.type === 'operator';
	var isOperatorTokenWithValue = (t, v) => isOperatorToken(t) && t.value === v;
	var isOpeningBracketToken = t => isOperatorTokenWithValue(t, '(');
	var isClosingBracketToken = t => isOperatorTokenWithValue(t, ')');
	var isNewlineToken = t => t && t.type === 'newline';
	const reservedKeywords = ['var', 'func', 'import', 'class',
	'if', 'else', 'switch', 'fallthrough', 'case', 'default',
	'continue', 'break', 'while', 'do', 'for', 'in', 'by', 'return'];
	
	// var program_string_without_comments 
	// = source.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
	let original_tokens = source.tokens('=<>!+-*&|/%^*.:', '=<>&|*+-.');
	let desugared_tokens = [];
	
	// desugaring
	let brace_count = 0;
	let class_level = 0;
	let class_arg_positions = _list();
	let class_constructor = false;
	let class_constructor_arg_tokens = [];
	let class_constructor_stack = _list();
	let decorator_stack = _list();
	let decorator_positions = _list();
	let decorated_funcs = _list();
	for (let i = 0; i < original_tokens.length; i++) {
		let t = original_tokens[i];
		if (t.type !== 'operator' && t.type !== 'name') {
			desugared_tokens.push(t);
			continue;
		}
		switch (t.value) {
			case '[':
				if (i > 0 && 
					// array[x]
					(isVarNameToken(original_tokens[i-1]) ||
						// ...[x][x]
						isOperatorTokenWithValue(original_tokens[i-1], ']') ||
						// application[x]
						isOperatorTokenWithValue(original_tokens[i-1], ')')
					) ||
					// string[x]
					(isStringToken(original_tokens[i-1]))) {
					desugared_tokens.push(original_tokens[i]); // '['
				} else {
					// list
					desugared_tokens.push(new Token('name', '$list', t.line));
				}
				desugared_tokens.push(new Token('operator', '(', t.line));
				break;
			case ']':
				if (desugared_tokens.length > 0) {
					let prev_token = desugared_tokens[desugared_tokens.length-1];
					if (isOperatorTokenWithValue(',')) {
						// remove trailing comma
						desugared_tokens.pop();
					}
				}
				desugared_tokens.push(new Token('operator', ')', t.line));
				break;
			case 'class':
				class_constructor_stack = _pair(false, class_constructor_stack);
				desugared_tokens.push(new Token('name', 'func', t.line));
				i++;
				t = original_tokens[i];
				desugared_tokens.push(t); // class name
				desugared_tokens.push(new Token('operator', '(', t.line));
				class_arg_positions = _pair(desugared_tokens.length, class_arg_positions);
				desugared_tokens.push(new Token('operator', ')', t.line));
				
				// inheritance (Python-like)
				if (original_tokens[i+1].value === '(') {
					t = original_tokens[++i]; // '('
					desugared_tokens.push(new Token('name', 'extends', t.line));
					t = original_tokens[++i]; // first parent
					while (!isClosingBracketToken(t)) {
						desugared_tokens.push(t); // parent name or ','
						t = original_tokens[++i];
					}
				}
				class_level++;
				break;
			case '@':
				class_constructor_stack = _pair(true, _tail(class_constructor_stack));
				// constructor
				if (class_level > 0 && brace_count === class_level) {
					if (_is_empty(class_arg_positions)){
						throwError(t, 'Invalid constructor position.');
					}
					desugared_tokens.push(new Token('name', 'func', t.line));
					desugared_tokens.push(t); // '@'
					i++;
					t = original_tokens[i];
					desugared_tokens.push(t); // '('
					let position = _head(class_arg_positions);
					i++;
					t = original_tokens[i];
					class_constructor_arg_tokens = [];
					while (t.value !== ')') {
						
						desugared_tokens.push(t);
						let trans_token;
						if (t.type === 'name') {
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
					desugared_tokens.push(t); // ')'
					class_constructor = true;
				} else {
					// other usage of '@'
					desugared_tokens.push(t);
				}
				break;
			case '#':
				// decorator
				let decorators = [];
				let func_arg_tokens = [];
				while (isOperatorTokenWithValue(t, '#')) {
					decorator_stmt = [];
					t = original_tokens[++i];
					while (!isNewlineToken(t)) {
						decorator_stmt.push(t);
						t = original_tokens[++i];
					}
					decorators.push(decorator_stmt);
					
					t = original_tokens[++i];
					if (isNewlineToken(t)) {
						t = original_tokens[++i];
					}
				}

				decorator_stack = _pair(decorators, decorator_stack);
				decorator_positions = _pair(brace_count, decorator_positions);
				//desugared_tokens.push(t); // func
				t = original_tokens[i+1];
				decorated_funcs = _pair(t, decorated_funcs);
				i--;
				//desugared_tokens.push(t); // func name
				break;
			case '{':
				desugared_tokens.push(t);
				brace_count++;
				if (class_level > 0 && brace_count === class_level) {
					// start of class
					desugared_tokens.push(new Token('name', 'this', t.line));
					desugared_tokens.push(new Token('operator', ':=', t.line));
					desugared_tokens.push(new Token('name', 'class', t.line));
					desugared_tokens.push(new Token('operator', '(', t.line));
					desugared_tokens.push(new Token('operator', ')', t.line));
					desugared_tokens.push(new Token('operator', '{', t.line));
					desugared_tokens.push(new Token('operator', '}', t.line));
				}
				break;
			case '}':
				if (class_level > 0 && brace_count === class_level) {
					// end of class
					if (_head(class_constructor_stack)) {
						desugared_tokens.push(new Token('name', '@', t.line));
						desugared_tokens.push(new Token('operator', '(', t.line));
						desugared_tokens = desugared_tokens.concat(class_constructor_arg_tokens);
						desugared_tokens.push(new Token('operator', ')', t.line));
					}
					class_constructor_stack = _tail(class_constructor_stack);
					desugared_tokens.push(new Token('name', 'return', t.line));
					desugared_tokens.push(new Token('name', 'this', t.line));
					class_level--;
					class_arg_positions = _tail(class_arg_positions);
				} else if(class_level > 0 && class_constructor && brace_count === class_level+1) {
					// end of constructor
					class_constructor = false;
				}
				desugared_tokens.push(t); // '}'
				
				brace_count--;
				
				// run decorator
				if (!_is_empty(decorator_positions) && brace_count === _head(decorator_positions)) {
					let decorators = _head(decorator_stack);
					let decorated_func = _head(decorated_funcs);
					for (let i = 0; i < decorators.length; i++) {
						let decorator_stmt = decorators[i];
						let decorator = decorator_stmt[0];
						desugared_tokens.push(new Token('name', decorated_func.value, decorator.line));
						desugared_tokens.push(new Token('operator', '=', decorator.line));
						
						let has_args = false;
						let decorator_args = [];
						if (isClosingBracketToken(decorator_stmt[decorator_stmt.length-1])) {
							has_args = true;
							let decorator_func = [];
							let index = 0;
							while (!isOpeningBracketToken(decorator_stmt[index]) && index < decorator_stmt.length) {
								decorator_func.push(decorator_stmt[index]);
								index++;
							}
							if (index === decorator_stmt.length-2) {
								// empty args
								has_args = false;
							} else {
								decorator_args = decorator_stmt.slice(index, decorator_stmt.length);
							}
							desugared_tokens = desugared_tokens.concat(decorator_func);
						} else {
							desugared_tokens = desugared_tokens.concat(decorator_stmt);
						}
						
						desugared_tokens.push(new Token('operator', '(', decorator.line));
						desugared_tokens.push(new Token('name', decorated_func.value, decorator.line));
						if (has_args) {
							desugared_tokens.push(new Token('operator', ',', decorator.line));
							desugared_tokens = desugared_tokens.concat(decorator_args.slice(1, decorator_args.length - 1));
						}
						desugared_tokens.push(new Token('operator', ')', decorator.line));
						desugared_tokens.push(new Token('newline', '', decorator.line));
					}
					decorator_positions = _tail(decorator_positions);
					decorator_stack = _tail(decorator_stack);
					decorated_funcs = _tail(decorated_funcs);
				}
				break;
			default:
				if (t.type === 'name' && t.value && t.value.length > 0) {
					let firstChar = t.value.charAt(0);
					if (firstChar === '@') {
						// prevent defining system generated variables
						throwError(t, 'Invalid variable name: ' + t.value);
					}
				}
				desugared_tokens.push(t);
		}
	}
/*
	for (let i = 0 ; i < desugared_tokens.length; i++) {
		console.log(desugared_tokens[i].value);
	}*/
	
	return desugared_tokens;
}
