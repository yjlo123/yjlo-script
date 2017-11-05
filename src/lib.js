function _type(x) {
	if (x === null) {
		return null;
	} else if (_is_number(x)) {
		return 'number';
	} else if (_is_string(x)) {
		return 'string';
	} else if (x === true || x === false) {
		return 'boolean';
	} else if (_is_list(x)) {
		return 'list';
	} else if (_is_pair(x)) {
		return 'pair';
	} else if (_is_array(x)) {
		return 'array';
	} else {
		return null;
	}
}

function _pair(x, xs) {
	return [x, xs];
}

function _is_pair(x) {
	return x instanceof Array && x.length == 2;
}

function _head(xs) {
	return xs[0];
}

function _tail(xs) {
	return xs[1];
}

function _is_list(xs) {
	return xs && (_is_empty(xs) || (_tail(xs) !== undefined && _is_list(_tail(xs))));
}

function _is_in_list(x, xs) {
	if (_is_empty(xs)) return false;
	if (x === _head(xs)) return true;
	return _is_in_list(x, _tail(xs));
}

function _list() {
	var the_list = [];
	for (var i = arguments.length - 1; i >= 0; i--)
		the_list = _pair(arguments[i], the_list);
	return the_list;
}

function _is_array(x) {
	if (this.Array.isArray === undefined) {
		return x instanceof Array;
	} else {
		return Array.isArray(x);
	}
}

function _is_empty(xs) {
	if (_is_array(xs)) {
		if (xs.length === 0) {
			return true;
		} else if (xs.length === 2) {
			return false;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

function _is_number(xs) {
	return typeof xs == 'number';
}

function _is_string(xs) {
	return typeof xs == 'string';
}

function _length(xs) {
	return (_is_empty(xs)) ? 0 : 1 + _length(_tail(xs));
}

function apply(f,xs) {
	var args = [];
	var len = _length(xs);
	for (var i=0; i < len; i++) {
		args[i] = _head(xs);
		xs = _tail(xs);
	}
	return f.apply(f,args);
}

function map(f) {
	if (_is_empty(arguments[1])) return [];
	else {
		var f_args = [];
		var map_args = [f];
		for (var i=1; i < arguments.length; i++) {
			f_args[i-1] = _head(arguments[i]);
			map_args[i] = _tail(arguments[i]);
		}
		return _pair(f.apply(f,f_args),map.apply(map,map_args));
	}
}
function runtime() {
	var d = new Date();
	return d.getTime();
}

function _now() {
	return new Date().getTime();
}

function _array_to_list(arr) {
	let lst = _list();
	for (let i = arr.length - 1; i >= 0; i--) {
		lst = _pair(arr[i], lst);
	}
	return lst;
}

function _list_to_array(list) {
	let arr = Array();
	let i = 0;
	while (!_is_empty(list)) {
		arr[i++] = _head(list);
		list = _tail(list);
	}
	return arr;
}

function _nested_list_to_array(list) {
	let arr = Array();
	let i = 0;
	while (!_is_empty(list)) {
		if (_is_list(_head(list))) {
			arr[i++] = _nested_list_to_array(_head(list));
		} else {
			arr[i++] = _head(list);
		}
		list = _tail(list);
	}
	return arr;
}

function _string_to_char_list(str) {
	if (typeof str !== 'string' && !(str instanceof String)) {
		return _list();
	}
	var char_list = _list();
	for (var i = str.length - 1; i >= 0; i--) {
		char_list = _pair(str.charAt(i), char_list);
	}
	return char_list;
}

function _char_code(char) {
	return char.charCodeAt(0);
}

function _list_to_string(arg, segment) {
	segment += '[';
	while (!_is_empty(arg)) {
		// nested list
		segment += (_process_output([_head(arg)]) + ', ');
		arg = _tail(arg);
	}
	// remove ', '
	if (segment.length !== 1) {
		segment = segment.slice(0, -2);
	}
	segment += ']';
	return segment;
}

function _pair_to_string(arg) {
	let str = '';
	str += '(';
	str += _process_output([_head(arg)]);
	str += ', ';
	str += _process_output([_tail(arg)]);
	str += ')';
	return str;
}

/*  UI Output */
function _process_output(args) {
	let output = '';

	for (let i = 0; i < args.length; i++) {
		let arg = args[i];
		let segment = '';
		if (arg && _is_list(arg)) {
			segment += _list_to_string(arg, '');
		} else if (arg && _is_pair(arg)) {
			segment += _pair_to_string(arg);
		} else if (arg && arg.tag === 'function_value') {
			if (arg.is_class) {
				segment = apply(refer(arg, 'toString'),_list(),'?');
			} else {
				segment = '{func}';
			}
		} else {
			segment = arg;
		}
		output += ((output === '' ? '' : ' ') + segment);
	}
	return output;
}

function _put() {
	var output_value = _process_output(arguments);
	jqconsole.Write(output_value, 'console-default');
}

function _print() {
	var output_value = _process_output(arguments);
	jqconsole.Write(output_value + '\n', 'console-default');
}

function _input(message, value, show_in_console) {
	var input_value = prompt(message, value || '');
	if (show_in_console !== false) {
		jqconsole.Write(input_value + '\n', 'jqconsole-old-input');
	}
	return input_value;
	/*
	jqconsole.Input(function(input) {
		//jqconsole.Write('=> ' + input + '\n', 'console-arrow');
	});*/
}