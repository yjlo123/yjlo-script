
function pair(x,xs) {
	return [x,xs];
}

function is_pair(x) {
	return x instanceof Array && x.length == 2;
}

function head(xs) {
	return xs[0];
}

function tail(xs) {
	return xs[1];
}

function is_list(xs) {
	return xs && (is_empty(xs) || (tail(xs) !== undefined && is_list(tail(xs))));
}

function is_in_list(x, xs) {
	if (is_empty(xs)) return false;
	if (x === head(xs)) return true;
	return is_in_list(x, tail(xs));
}

function list() {
	var the_list = [];
	for (var i = arguments.length - 1; i >= 0; i--)
		the_list = pair(arguments[i],the_list);
	return the_list;
}

function array_test(x) {
	if (this.Array.isArray === undefined) {
		return x instanceof Array;
	} else {
		return Array.isArray(x);
	}
}

function is_empty(xs) {
	if (array_test(xs)) {
		if (xs.length === 0) {
			return true; 
		}else if (xs.length === 2) {
			return false;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

function is_number(xs) {
	return typeof xs == "number";
}

function is_string(xs) {
	return typeof xs == "string";
}

function length(xs) {
	return  (is_empty(xs)) ? 0 : 1 + length(tail(xs));
}

function apply(f,xs) {
	var args = [];
	var len = length(xs);
	for (var i=0; i < len; i++) {
		args[i] = head(xs);
		xs = tail(xs);
	}
	return f.apply(f,args);
}

function map(f) {
	if (is_empty(arguments[1])) return [];
	else {
		var f = arguments[0];
		var f_args = [];
		var map_args = [f];
		for (var i=1; i < arguments.length; i++) {
			f_args[i-1] = head(arguments[i]);
			map_args[i] = tail(arguments[i]);
		}
		return pair(f.apply(f,f_args),map.apply(map,map_args));
	}
}

function display(x) {
	print(format(x));
}

function newline() { 
	print('');
	return;
}

function runtime() {
	var d = new Date();
	return d.getTime();
}

function _floor(n) {
	return Math.floor(n);
}

function _ceil(n) {
	return Math.ceil(n);
}

function _trunc(n) {
	return Math.trunc(n);
}

function _sqrt(n) {
	return Math.sqrt(n);
}

function _round(n, d) {
	if (!d) return Math.round(n);
	var precision = Math.pow(10, d);
	return Math.round(n * precision) / precision;
}

function _string_to_char_list(str) {
	if (typeof str !== 'string' && !(str instanceof String)){
		return list();
	}
	var char_list = list();
	for (var i = str.length-1; i >= 0; i--) {
		char_list = pair(str.charAt(i), char_list);
	}
	return char_list;
}

function _char_code(char) {
	return char.charCodeAt(0);
}

/*  UI Output */
function print() {
	//window.latestConsole.display(x);
	//x = x+"";
	//x = x.replace(/(?:\r\n|\r|\n)/g, '<br />');
	
	var output = "";
	
	for (var i = 0; i < arguments.length; i++){
		var arg = arguments[i];
		if (arguments[i] && is_list(arguments[i])){
			// print list
			output += "[";
			while (!is_empty(arg)){
				output += (head(arg)+", ");
				arg = tail(arg);
			}
			if(output.length !== 1){
				output = output.slice(0, -2);
			}
			output += "]";
		}else{
			if (arg && arg.tag === 'primitive' && typeof(arg.implementation) === 'boolean'){
				arg = arg.implementation.toString();
			}
			output += arg;
		}
	}
	
	$("#program-result").append("<pre>"+output+"</pre>");
	return undefined;
}

function escapeHTML(s) { 
	return s.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
}