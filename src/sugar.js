function tokenizeAndDesugaring(source){
	
	/* Temp copied from parse.js */
	var isVarNameToken = function (t) {
		if (reservedKeywords.indexOf(t.value) != -1){
			return false;
		}
		return t.type === 'name';
	};
	var isOperatorToken = t => t && t.type === 'operator';
	var isOperatorTokenWithValue = (t, v) => isOperatorToken(t) && t.value === v;
	var isClosingBracketToken = t => isOperatorTokenWithValue(t, ')');
	const reservedKeywords = ['var', 'func', 'import', 'class',
	'if', 'else', 'switch', 'fallthrough', 'case', 'default',
	'continue', 'break', 'while', 'do', 'for', 'in', 'by', 'return'];
	
	// var program_string_without_comments 
	// = source.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
	let original_tokens = source.tokens('=<>!+-*&|/%^*.:,', '=<>&|*+-.');
	let desugared_tokens = [];
	
	// desugaring
	let brace_count = 0;
	let class_level = 0;
	let class_arg_positions = _list();
	let class_constructor = false;
	let class_constructor_arg_tokens = [];
	let class_constructor_stack = _list();
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
						isOperatorTokenWithValue(original_tokens[i-1], ')'))) {
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
			case '{':
				desugared_tokens.push(t);
				brace_count++;
				if (class_level > 0 && brace_count === class_level) {
					// start of class
					desugared_tokens.push(new Token('name', 'this', t.line));
					desugared_tokens.push(new Token('operator', ':=', t.line));
					desugared_tokens.push(new Token('name', 'func', t.line));
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