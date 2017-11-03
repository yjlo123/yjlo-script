class Environment {
	constructor() {
		this.env = [];
	}
}

class Frame {
	constructor() {
		this.frame = {};
	}
	
	init() {
		this.add_constant('null', null);
		this.add_constant('true', true);
		this.add_constant('false', false);
	}
	
	add_constant(name, value) {
		this.frame[name] = value;
	}
}

var the_global_environment = null;
var the_console_environment = null;
var the_empty_environment = [];
var an_empty_frame = {};

function throwError(line, message) {
	throw new Error(`[line ${line}] ${message}`);
}

function is_tagged_object(stmt, the_tag) {
	return stmt && typeof stmt === 'object' && stmt.tag === the_tag;
}

function is_self_evaluating(stmt) {
	return stmt === [] ||
	typeof stmt === 'number' ||
	typeof stmt === 'string';
}

// =============== ENV ===================
function enclosing_environment(env) {
	return _tail(env);
}

function first_frame(env) {
	return _head(env);
}

function is_empty_environment(env) {
	return _is_empty(env);
}

function enclose_by(frame, env) {
	return _pair(frame, env);
}

function make_frame(variables, values) {
	if (_is_empty(variables))
		return {};
	else {
		var next_tail = _is_empty(values) ? values : _tail(values);
		var frame = make_frame(_tail(variables),next_tail);
		frame[_head(variables)] = _is_empty(values) ? null : _head(values);
		return frame;
	}
}

function duplicateFirstFrame(env) {
	let frame = first_frame(env);
	let keys = _list();
	let vals = _list();
	for (let key in frame) {
		// skip loop if the property is from prototype
		if (!frame.hasOwnProperty(key)) continue;
		keys = _pair(key, keys);
		let value = frame[key];
		
		// array should not be copied as an object
		if (typeof value === 'object' && !(value instanceof Array)) {
			// shallow copied value
			vals = _pair(jQuery.extend({}, value), vals);
		} else {
			vals = _pair(value, vals);
		}
	}
	
	// update copied frame's function env
	let new_env = enclose_by(make_frame(keys, vals), env);
	let new_frame = first_frame(new_env);
	for (let key in new_frame) {
		if (!new_frame.hasOwnProperty(key)) continue;
		let val = new_frame[key];
		if (val.tag === 'function_value') {
			val.environment = new_env;
		}
	}
	return new_env;
}

function set_value_to_array(variable, indices, value) {
	if (_length(indices) === 1) {
		variable[_head(indices)] = value;
	} else {
		set_value_to_array(variable[_head(indices)], _tail(indices), value);
	}
}

function add_binding_to_frame(variable, value, frame, optional_indices) {
	if (typeof optional_indices !== 'undefined') {
		set_value_to_array(frame[variable], optional_indices, value);
	} else {
		frame[variable] = value; // object field assignment
	}
}

function has_binding_in_frame(variable, frame) {
	return frame.hasOwnProperty(variable);
}

function define_variable(variable, value, env) {
	var frame = first_frame(env);
	add_binding_to_frame(variable, value, frame);
	return value;
}


// ===================================================

function isBuiltInVariable(variable) {
	if (variable && variable.length > 0) {
		let firstChar = variable.charAt(0);
		if (firstChar === '$') {
			return true;
		}
	}
	return false;
}

function isValidVariableName(variable) {
	if (variable && !isBuiltInVariable(variable) &&
		!/^(true|false|null)$/.test(variable)) {
		return true;
	}
	return false;
}

function variable_name(stmt) {
	return stmt.name;
}

function lookup_variable_value(stmt, variable, env) {
	function env_loop(env) {
		if (is_empty_environment(env))
			throwError(stmt&&stmt.line?stmt.line:'?', 'Cannot find variable: ' + variable);
		else if (has_binding_in_frame(variable,first_frame(env)))
			return first_frame(env)[variable];
		else return env_loop(enclosing_environment(env));
	}
	return env_loop(env);
}

function assignment_left(stmt) {
	return stmt.left;
}
function assignment_right(stmt) {
	return stmt.right;
}
	
function set_variable_value(stmt, variable, value, env, optional_indices) {
	if (!isValidVariableName(variable)) {
		throwError(stmt.line, `Invalid variable name: ${variable}`);
	}
	function env_loop(env) {
		if (is_empty_environment(env))
			throwError(stmt && stmt.line ? stmt.line : '?', 'Cannot find variable: ' + variable);
		else if (has_binding_in_frame(variable, first_frame(env)))
			add_binding_to_frame(variable, value, first_frame(env), optional_indices);
		else env_loop(enclosing_environment(env));
	}
	env_loop(env);
	return;
}
	 
function evaluate_assignment(stmt, env) {
	let value = evaluate(assignment_right(stmt),env);
	let left = assignment_left(stmt);
	let left_value = stmt.returnLeft ? evaluate(left, env) : null;
	if (left instanceof ApplicationNode) {
		if (operator(left).name === '[') {
			// array indexing
			let indices = [];
			let array = left;
			
			while (array instanceof ApplicationNode && operator(array).name === '[') {
				let array_left = _head(operands(array));
				let array_right = _head(_tail(operands(array)));
				let index = evaluate(array_right, env);
				indices = _pair(index, indices);
				array = array_left;
			}
			set_variable_value(stmt, array.name, value, env, indices);
		} else {
			// member reference
			let member = _head(_tail(operands(left))).name;
			set_variable_value(stmt, member, value,
								function_value_environment(
									evaluate(_head(operands(left)), env)));
		}
	} else {
		// variable
		set_variable_value(stmt, left.name, value, env);
	}
	if (stmt.returnLeft) {
		return left_value;
	}
	return value;
}

function var_definition_variable(stmt) {
	return stmt.left;
}
function var_definition_value(stmt) {
	return stmt.right;
}

function evaluate_var_definition(stmt, env) {
	let variable = var_definition_variable(stmt);
	if(!isValidVariableName(variable)) {
		throwError(stmt.line, `Invalid variable name: ${variable}`);
	}
	return define_variable(variable,
		evaluate(var_definition_value(stmt), env),
		env);
}

function if_predicate(stmt) {
	return stmt.predicate;
}
function if_consequent(stmt) {
	return stmt.consequent;
}
function if_alternative(stmt) {
	return stmt.alternative;
}

function evaluate_if_statement(stmt, env) {
	if (is_true(evaluate(if_predicate(stmt), env)))
		return evaluate(if_consequent(stmt), extend_environment([], [], env));
	else{
		if(if_alternative(stmt)){
			return evaluate(if_alternative(stmt), extend_environment([], [], env));
		}
	}
}

function switch_variable(stmt) {
	return stmt.variable;
}

function switch_cases(stmt) {
	return stmt.cases;
}

function switch_default(stmt) {
	return stmt.default;
}

function evaluate_switch_statement(stmt, env) {
	var cases = switch_cases(stmt);
	var found_case = false;
	while ( !found_case && !_is_empty(cases) ) {
		var result = null;
		if (_is_in_list(evaluate(switch_variable(stmt), env), _head(cases).value)){
			found_case = true;
			result = evaluate(_head(cases).stmt, extend_environment([], [], env));
		}
		if (result instanceof ReturnValue) {
			return result;
		}
		if (result instanceof BreakValue) {
			return;
		}
		if (result instanceof FallthroughValue) {
			found_case = false;
		}
		cases = _tail(cases);
	}
	if (!found_case && switch_default(stmt)) {
		evaluate(switch_default(stmt), env);
	}
}

function for_variable(stmt) {
	return stmt.variable;
}
function for_range(stmt) {
	return stmt.range;
}
function for_increment(stmt) {
	return stmt.increment;
}
function for_consequent(stmt) {
	return stmt.consequent;
}

function is_true(x) {
	return ! is_false(x);
}
function is_false(x) {
	return x === false || x === 0 || x === '' || 
		x === undefined || x === NaN || x === null || x.implementation === false;
}

function evaluate_while_statement(stmt, env) {
	if (is_true(evaluate(if_predicate(stmt), env))){
		var result = evaluate(if_consequent(stmt), extend_environment([], [], env));
		if (result instanceof ReturnValue){
			// encounter return statement in while loop
			return result;
		}
		if (result instanceof BreakValue){
			return;
		}

		return evaluate_while_statement(stmt, env);
	}
}

function evaluate_do_while_statement(stmt, env) {
	var result = evaluate(if_consequent(stmt), extend_environment([], [], env));
		if (result instanceof ReturnValue){
			return result;
		}
		if (result instanceof BreakValue){
			return;
		}
	if (is_true(evaluate(if_predicate(stmt), env))){
		return evaluate_do_while_statement(stmt, env);
	}
}

function evaluate_for_statement(stmt, env) {
	let extented_env = extend_environment([], [], env);
	let range = for_range(stmt);
	
	if (range.tag === 'range') {
		// value range
		let range_from_value = evaluate(range.from, env);
		define_variable(for_variable(stmt).name,
							range_from_value,
							extented_env);
		return evaluate_for_statement_range_clause(stmt, 
							evaluate(range.to, env),
							range.closed,
							evaluate(for_increment(stmt) || 1, env),
							extented_env);
	} else if (range.tag === 'variable' || range.tag === 'application') {
		// list
		let list_value = evaluate(range, env);
		if (!_is_list(list_value)) throwError(stmt.line, 'Invalid range.');
		define_variable(for_variable(stmt).name, null, extented_env);
		return evaluate_for_statement_list_clause(stmt, list_value, extented_env);
	} else {
		throwError(stmt.line, 'Invalid range.');
	}
}

function evaluate_for_statement_range_clause(stmt, range_to_value, range_closed, increment_value, env) {
	let variable_value = evaluate(for_variable(stmt), env);
	if ((increment_value > 0 &&
			((!range_closed && variable_value < range_to_value) ||
				range_closed && variable_value <= range_to_value)) ||
		(increment_value < 0 &&
			((!range_closed && variable_value > range_to_value) ||
				(range_closed && variable_value >= range_to_value)))) {
		let result = evaluate(for_consequent(stmt), env);
		if (result instanceof ReturnValue) {
			// encounter return statement in for loop
			return result;
		}
		if (result instanceof BreakValue) {
			return null;
		}
		// increment
		set_variable_value(stmt, for_variable(stmt).name,
			variable_value + increment_value,
			env);
		return evaluate_for_statement_range_clause(stmt, range_to_value, range_closed, increment_value, env);
	}
}

function evaluate_for_statement_list_clause(stmt, range_list, env) {
	if (_is_empty(range_list)) return;
	// set list head as the current variable value
	set_variable_value(stmt, for_variable(stmt).name, _head(range_list), env);
	// evaluate consequent
	let result = evaluate(for_consequent(stmt), env);
	if (result instanceof ReturnValue) {
		return result;
	}
	if (result instanceof BreakValue) {
		return null;
	}
	return evaluate_for_statement_list_clause(stmt, _tail(range_list), env);
}

function function_definition_name(stmt) {
	return stmt.name;
}
function function_definition_parameters(stmt) {
	return stmt.parameters;
}
function function_definition_body(stmt) {
	return stmt.body;
}
function function_definition_parents(stmt) {
	return stmt.parent;
}

function evaluate_function_definition(stmt, env) {
	let parent_names = function_definition_parents(stmt);
	let is_class = stmt.is_class;
	if (!_is_empty(parent_names)) {
		// extends major parent
		let major_parent_name = _head(parent_names);
		let major_parent = lookup_variable_value(null, major_parent_name, env);
		let parent_env = extend_environment([],[],function_value_environment(major_parent));
		evaluate(function_value_body(major_parent), parent_env);
		parent_names = _tail(parent_names);
		
		// extends minor parents
		while (!_is_empty(parent_names)) {
			let mixin_name = _head(parent_names);
			let mixin = lookup_variable_value(null, mixin_name, env);
			evaluate(function_value_body(mixin), parent_env);
			parent_names = _tail(parent_names);
		}
		
		return new FunctionValue(function_definition_name(stmt),
							function_definition_parameters(stmt),
							function_definition_body(stmt), parent_env,
							true, is_class, stmt.line);
	}
	return new FunctionValue(function_definition_name(stmt),
							function_definition_parameters(stmt),
							function_definition_body(stmt), env,
							false, is_class, stmt.line);
}

function is_compound_function_value(f) {
	return is_tagged_object(f,'function_value');
}
function function_value_parameters(value) {
	return value.parameters;
}
function function_value_body(value) {
	return value.body;
}
function function_value_environment(value) {
	return value.environment;
}
	 
function is_sequence(stmt) {
	return _is_list(stmt);
}
function is_last_statement(stmts) {
	return _is_empty(_tail(stmts));
}
function first_statement(stmts) {
	return _head(stmts);
}
function rest_statements(stmts) {
	return _tail(stmts);
}
		
function evaluate_sequence(stmts, env) {
	if (is_last_statement(stmts))
		return evaluate(first_statement(stmts),env);
	else {
		var first_stmt_value = evaluate(first_statement(stmts),env);
		if (first_stmt_value instanceof ReturnValue ||
			first_stmt_value instanceof ContinueValue ||
			first_stmt_value instanceof BreakValue)
			return first_stmt_value;
		else return evaluate_sequence(rest_statements(stmts),env);
	}
}

function operator(stmt) {
	return stmt.operator;
}
function operands(stmt) {
	return stmt.operands;
}
function no_operands(ops) {
	return _is_empty(ops);
}
function first_operand(ops) {
	return _head(ops);
}
function rest_operands(ops) {
	return _tail(ops);
}

function primitive_implementation(fun) {
	return fun.implementation;
}

function apply_in_underlying_javascript(prim, argument_list) {
	var argument_array = [];
	var i = 0;
	while (!_is_empty(argument_list)) {
		argument_array[i++] = _head(argument_list);
		argument_list = _tail(argument_list);
	}
	return prim.apply(prim, argument_array);
}

function primitive_implementation(fun) {
	return fun.implementation;
}

function apply_primitive_function(fun,argument_list) {
	 return apply_in_underlying_javascript(primitive_implementation(fun),
														argument_list);
}

function extend_environment(vars, vals, base_env, line) {
	first_frame(base_env)['_args_'] = vals;
		return enclose_by(make_frame(vars, vals), base_env);
}

function update_environment(vars, vals, base_env) {
	// _args_
	first_frame(base_env)['_args_'] = vals;
	
	if (!_is_empty(vars) && _length(vars) >= _length(vals)){
		// add var-val pair to env
		first_frame(base_env)[_head(vars)] = _is_empty(vals) ? null : _head(vals);
		return update_environment(_tail(vars), _tail(vals), base_env);
	} else if (_is_list(vars) && _is_list(vals) && _length(vars) < _length(vals)) {
		return enclose_by(make_frame(vars, vals), base_env);
	}
}

function return_statement_expression(stmt) {
	return stmt.expression;
}

function return_value_content(value) {
	return value.content;
}

function apply(fun, args, line) {
	if (fun instanceof Primitive) {
		return apply_primitive_function(fun, args);
	} else if (is_compound_function_value(fun)) {
		let func_env = null;
		if (fun.has_parent) {
			// if has parent, fun's env is set to be parent's env when make_function_value
			// override parent environment
			func_env = function_value_environment(fun);
			func_env = duplicateFirstFrame(func_env);

			update_environment(function_value_parameters(fun), args, func_env);
			// then create self environment
			//func_env = extend_environment([], [], func_env);
		} else {
			// create self (new) environment
			func_env = extend_environment(function_value_parameters(fun),
											args,
											function_value_environment(fun), line);
		}
		// define_variable('this', func_env, func_env);
		let result = evaluate(function_value_body(fun), func_env);
		if (result instanceof ReturnValue) {
			return return_value_content(result);
		}
	} else if (is_native_function(fun)) {
		return fun(_nested_list_to_array(args));
	} else {
		throwError(line, 'Unknown function type - APPLY: ' + fun);
	}
	return null;
}

function apply_logic(fun_raw, args, env) {
	var oprnd1 = evaluate(_head(args), env);
	var oprnd2 = false;
	if ((fun_raw.name === '&&' && oprnd1 === true) ||
		(fun_raw.name === '||' && oprnd1 === false)) {
		oprnd2 = evaluate(_head(_tail(args)), env);
	}
	var fun = evaluate(fun_raw, env);
	var arg_list = _pair(oprnd1, _pair(oprnd2, _list()));
	return apply_in_underlying_javascript(primitive_implementation(fun), arg_list);
}

function apply_ternary(fun_raw, args, env) {
	if (_length(args) !== 3) {
		throwError('?', 'Invalid conditional expression');
	}
	var condition = _head(args);
	var expTrue = _head(_tail(args));
	var expFalse = _head(_tail(_tail(args)));
	
	if (evaluate(condition, env)) {
		return evaluate(expTrue, env);
	} else {
		return evaluate(expFalse, env);
	}
}

function list_method(list, method) {
	switch (method) {
		case 'head':
			return _head(list);
		case 'tail':
			return _tail(list);
		case 'isEmpty':
			return _is_empty(list);
		case 'len':
			return _length(list);
		default:
			throwError('?', 'Unknown list method: ' + method);
	}
}

function string_method(str, method) {
	switch (method) {
		case 'len':
			return str.length;
		case 'toCharList':
			return _string_to_char_list(str);
		case 'charCode':
			if (str.length === 0){
				return null;
			} else if (str.length === 1) {
				return _char_code(str);
			} else {
				let char_list = _list();
				for (let i = str.length-1; i >= 0; i--) {
					char_list = _pair(_char_code(str.charAt(i)), char_list)
				}
				return char_list;
			}
			return null;
		default:
			throwError('?', 'Unknown string method: ' + method);
	}
}

function pair_method(pair, method) {
	switch (method) {
		case 'head':
			return _head(pair);
		case 'tail':
			return _tail(pair);
		default:
			throwError('?', 'Unknown pair method: ' + member);
	}
}

function refer(fun, member) {
	// TODO prevent call private member outside class
	/*
	if (member.charAt(0) === '_'){
		throwError('?', 'Referencing private members is not allowed.');
	}
	*/
	
	let types = ['isList', 'isPair', 'isArray', 'isString', 'isNumber', 'isBoolean', 'isNull'];
	if (is_compound_function_value(fun)) {
		if (member === '_name_') {
			return fun.name;
		}
		let func_env = extend_environment([],[],function_value_environment(fun));
		if (function_value_body(fun)) {
			// evaluate function body to update environment
			evaluate(function_value_body(fun), func_env);
		}
		return lookup_variable_value(null, member, func_env);
	} else if (types.indexOf(member) !== -1) {
		switch(member) {
			case 'isList':
				return _is_list(fun);
			case 'isPair':
				return _is_pair(fun);
			case 'isArray':
				return _is_array(fun);
			case 'isString':
				return _is_string(fun);
			case 'isNumber':
				return _is_number(fun);
			case 'isBoolean':
				return fun === true || fun === false;
			case 'isNull':
				return fun === null;
		}
	} else if (_is_list(fun)) {
		return list_method(fun, member);
	} else if (_is_string(fun)) {
		return string_method(fun, member);
	} else if (_is_pair(fun)) {
		return pair_method(fun, member);
	} else if (fun instanceof Array) {
		switch (member) {
			case 'len':
				return fun.length;
			case 'index':
				return function(args) {
					return fun.indexOf(args[0]);
				};
			default:
			throwError('?', 'Unknown array method: ' + fun);
		}
	} else {
		throwError('?', 'Unknown function type - REFER: ' + fun);
	}
}

function is_native_function(v) {
	return typeof v === "function";
}

function list_of_values(exps, env) {
	if (no_operands(exps)) return [];
	else return _pair(evaluate(first_operand(exps), env),
						  list_of_values(rest_operands(exps), env));
}

function _create_array(length) {
	var arr = new Array(length || 0),
		i = length;
	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) arr[length-1 - i] = _create_array.apply(this, args);
	}
	return arr;
}

var primitive_functions = {
		'$pair': _pair,
		'$head': _head,
		'$tail': _tail,
		'$list': _list,
		'$is_list': _is_list,
		'$is_empty': _is_empty,
		'$type': _type,
		
		'put': _put,
		'print': _print,
		'input': _input,

		'$now': _now,
		'$string_to_char_list': _string_to_char_list,
		'$char_code': _char_code,
		
		'Array': function (x) {
			if (_is_list(x)) {
				return _nested_list_to_array(x);
			} else {
				return _create_array.apply(this, arguments);
			}
		},
		'[': (arr, index) => arr[index],
		
		'_-': (x) => -x, // negative
		'**': (x,y) => Math.pow(x,y), // power 
		'+': (x,y) => x + y,
		'-': (x,y) => x - y,
		'*': (x,y) => x * y,
		'/': (x,y) => Math.trunc(x / y),
		'/.': (x,y) => x / y,
		'%': (x,y) => x % y,
		'==': function (x,y) {
			if (_is_array(x) && _is_array(y)) {
				return array_equal(x, y);
			} else {
				return x === y;
			}
		},
		'!=': (x,y) => x !== y,
		'<': (x,y) => x < y,
		'<=': (x,y) => x <= y,
		'>': (x,y) => x > y,
		'>=': (x,y) => x >= y,
		'_!': (x) => ! x, // not
		'&&': (x,y) => x && y,
		'||': (x,y) => x || y,
		
		'&': (x,y) => x & y,
		'|': (x,y) => x | y,
		'_~': (x) => ~x, // NOT
		'^': (x,y) => x ^ y,
		'<<': (x,y) => x << y,
		'>>': (x,y) => x >> y,
		'>>>': (x,y) => x >>> y,
		
		',': (x,y) => _pair(x, y),
		
		'throw': (x) => { throw Error(x); }
};

function array_equal(x, y) {
	if (x.length != y.length)
		return false;
	for (let i = 0, l = x.length; i < l; i++) {
		if (x[i] instanceof Array && y[i] instanceof Array) {
			if (!array_equal(x[i], y[i]))
				return false;
		} else if (x[i] != y[i]) { 
			return false;
		}
	}
	return true;
}
	
function setup_environment() {
	var initial_env = enclose_by(an_empty_frame, the_empty_environment);
	for (var prop in primitive_functions) {
		define_variable(prop, new Primitive(primitive_functions[prop]), initial_env);
	}
	define_variable('undefined', undefined, initial_env);
	return initial_env;
}
	 
function evaluate_toplevel(stmt, env) {
	var value = evaluate(stmt, env);
	if (value instanceof ReturnValue)
		throwError(value.line, 'return not allowed outside of function definition.');
	if (value instanceof ContinueValue)
		throwError(value.line, 'Invalid continue statement.');
	if (value instanceof BreakValue)
		throwError(value.line, 'Invalid break statement.');
	else return value;
}

function evaluate(stmt, env) {
	// console.log(`[EVAL] ${stmt.line}`);
	if (is_self_evaluating(stmt)) 
		return stmt;
	else if (stmt instanceof VariableNode)
		return lookup_variable_value(stmt, variable_name(stmt), env);
	else if (stmt instanceof AssignmentNode) 
		return evaluate_assignment(stmt, env);
	else if (stmt instanceof VarDefNode) 
		return evaluate_var_definition(stmt, env);
	else if (stmt instanceof IfNode)
		return evaluate_if_statement(stmt, env);
	else if (stmt instanceof SwitchNode)
		return evaluate_switch_statement(stmt, env);
	else if (stmt instanceof WhileNode)
		return evaluate_while_statement(stmt, env);
	else if (stmt instanceof DoWhileNode)
		return evaluate_do_while_statement(stmt, env);
	else if (stmt instanceof ForNode)
		return evaluate_for_statement(stmt, env);
	else if (stmt instanceof ContinueNode)
		return new ContinueValue(stmt.line);
	else if (stmt instanceof BreakNode)
		return new BreakValue(stmt.line);
	else if (stmt instanceof FallthroughNode)
		return new fallthrough_value(stmt.line);
	else if (stmt instanceof FuncDefNode)
		return evaluate_function_definition(stmt, env);
	else if (is_sequence(stmt))
		return evaluate_sequence(stmt, env);
	else if (stmt instanceof ApplicationNode){
		var optr = operator(stmt);
		if (optr.name === '&&' || optr.name === '||'){
			// short-circuit evaluation
			return apply_logic(optr, operands(stmt), env);
		} else if (optr.name === '.') {
			// reference
			var oprnd = operands(stmt);
			var fun = _head(oprnd);
			var member = _head(_tail(oprnd));
			if (member instanceof ApplicationNode) {
				// reference function member
				return apply(refer(evaluate(fun, env), operator(member).name),
						list_of_values(operands(member), env), stmt.line);
			} else {
				// reference function field
				return refer(evaluate(fun,env), member.name);
			}
		} else if (optr.name === ':') {
			// ternary operator
			return apply_ternary(optr, operands(stmt), env);
		} else {
			return apply(evaluate(optr,env), list_of_values(operands(stmt), env), stmt.line);
		}
	} else if (stmt instanceof ReturnNode) {
		return new ReturnValue(evaluate(return_statement_expression(stmt), env), stmt.line);
	} else {
		throwError(stmt.line, 'Unknown expression type - evaluate: ' + stmt);
	}
}

function parse_program(program_string, program_parser, evaluate_callback) {
	if (program_string === null) {
		return {tag: 'exit'};
	} else {
		if(program_parser) {
			program_parser(program_string, evaluate_callback, tokenizeAndDesugaring, true);
		} else {
			alert('No parser available.');
		}
	}
}
	 
function driver_loop(program_string, program_parser, environment, finish_callback) {

	parse_program(program_string, program_parser, function(syntax_tree){
		if(debug) {
			console.log(JSON.stringify(syntax_tree, null, 4));
		}
		var output = evaluate_toplevel(syntax_tree, environment);
		finish_callback(output);
	});
}

function add_constant(name, value) {
	an_empty_frame[name] = value;
}

function initConstantValues() {
	an_empty_frame = {};
	add_constant('null', null);
	add_constant('true', true);
	add_constant('false', false);
}

function setup_global_environment() {
	initConstantValues();
	the_global_environment = setup_environment();
}

function setup_console_environment() {
	initConstantValues();
	the_console_environment = setup_environment();
}

function get_console_environment() {
	return the_console_environment;
}