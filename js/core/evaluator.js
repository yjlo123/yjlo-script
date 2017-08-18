var the_global_environment = null;
var the_console_environment = null;
var the_empty_environment = [];
var an_empty_frame = {};

function throwError(line, message) {
	throw new Error(`[line ${line}] ${message}`);
}

function is_tagged_object(stmt, the_tag) {
	return stmt && typeof stmt === "object" && stmt.tag === the_tag;
}

function is_self_evaluating(stmt) {
	return stmt === [] ||
	typeof stmt === "number" ||
	typeof stmt === "string";
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
	if (_is_empty(variables) && _is_empty(values)) 
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
		if (typeof value === 'object') {
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
		if (val.tag === "function_value") {
			val.environment = new_env;
		}
	}
	return new_env;
}

function add_binding_to_frame(variable, value, frame) {
	frame[variable] = value; // object field assignment
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

function is_variable(stmt) {
	return is_tagged_object(stmt, "variable");
}

function isBuiltInVariable(variable) {
	if (variable && variable.length > 0) {
		let firstChar = variable.charAt(0);
		if (firstChar === "$") {
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
			throwError(stmt&&stmt.line?stmt.line:"?", "Cannot find variable: " + variable);
		else if (has_binding_in_frame(variable,first_frame(env)))
			return first_frame(env)[variable];
		else return env_loop(enclosing_environment(env));
	}
	return env_loop(env);
}
	 
function is_assignment(stmt) {
	return is_tagged_object(stmt, "assignment");
}
function assignment_left(stmt) {
	return stmt.left;
}
function assignment_right(stmt) {
	return stmt.right;
}
	
function set_variable_value(stmt, variable, value, env) {
	if(!isValidVariableName(variable)) {
		throwError(stmt.line, `Invalid variable name: ${variable}`);
	}
	function env_loop(env) {
		if (is_empty_environment(env))
			throwError(stmt&&stmt.line?stmt.line:"?", "Cannot find variable: "+variable);
		else if (has_binding_in_frame(variable,first_frame(env)))
			add_binding_to_frame(variable,value,first_frame(env));
		else env_loop(enclosing_environment(env));
	}
	env_loop(env);
	return;
}
	 
function evaluate_assignment(stmt, env) {
	var value = evaluate(assignment_right(stmt),env);
	var left = assignment_left(stmt);
	var left_value = stmt.returnLeft ? evaluate(left, env) : null;
	if (is_application(left)){
		// member reference
		var member = _head(_tail(operands(left))).name;
		set_variable_value(stmt, member, value,
							function_value_environment(
								evaluate(_head(operands(left)), env)));
	} else {
		// variable
		set_variable_value(stmt, left.name, value, env);
	}
	if (stmt.returnLeft) {
		return left_value;
	}
	return value;
}
	 
function is_var_definition(stmt) {
	return is_tagged_object(stmt, "var_definition");
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
	 
function is_if_statement(stmt) {
	return is_tagged_object(stmt, "if");
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

function is_switch_statement(stmt) {
	return is_tagged_object(stmt, "switch");
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
		if (is_return_value(result)) {
			return result;
		}
		if (is_break_value(result)) {
			return;
		}
		if (is_fallthrough_value(result)) {
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

function is_while_statement(stmt) {
	return is_tagged_object(stmt,"while");
}
function is_do_while_statement(stmt) {
	return is_tagged_object(stmt,"do");
}
function is_for_statement(stmt) {
	return is_tagged_object(stmt,"for");
}

function is_true(x) {
	return ! is_false(x);
}
function is_false(x) {
	return x === false || x === 0 || x === "" || 
		x === undefined || x === NaN || x === null || x.implementation === false;
}

function evaluate_while_statement(stmt, env) {
	if (is_true(evaluate(if_predicate(stmt), env))){
		var result = evaluate(if_consequent(stmt), extend_environment([], [], env));
		if (is_return_value(result)){
			// encounter return statement in while loop
			return result;
		}
		if (is_break_value(result)){
			return;
		}

		return evaluate_while_statement(stmt, env);
	}
}

function evaluate_do_while_statement(stmt, env) {
	var result = evaluate(if_consequent(stmt), extend_environment([], [], env));
		if (is_return_value(result)){
			return result;
		}
		if (is_break_value(result)){
			return;
		}
	if (is_true(evaluate(if_predicate(stmt), env))){
		return evaluate_do_while_statement(stmt, env);
	}
}

function evaluate_for_statement(stmt, env) {
	let extented_env = extend_environment([], [], env);
	let range = for_range(stmt);
	
	if (range.tag === "range") {
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
	} else if (range.tag === "variable" || range.tag === "application") {
		// list
		let list_value = evaluate(range, env);
		if (!_is_list(list_value)) throwError(stmt.line, "Invalid range.");
		define_variable(for_variable(stmt).name, null, extented_env);
		return evaluate_for_statement_list_clause(stmt, list_value, extented_env);
	} else {
		throwError(stmt.line, "Invalid range.");
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
		if (is_return_value(result)) {
			// encounter return statement in for loop
			return result;
		}
		if (is_break_value(result)) {
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
	if (is_return_value(result)) {
		return result;
	}
	if (is_break_value(result)) {
		return null;
	}
	return evaluate_for_statement_list_clause(stmt, _tail(range_list), env);
}

function is_continue_statement(stmt) {
	return is_tagged_object(stmt,"continue");
}
function make_continue_value(stmt, env) {
	return { tag: "continue_value", line: stmt.line };
}
function is_continue_value(value) {
	return is_tagged_object(value,"continue_value");
}

function is_break_statement(stmt) {
	return is_tagged_object(stmt,"break");
}
function make_break_value(stmt, env) {
	return { tag: "break_value", line: stmt.line };
}
function is_break_value(value) {
	return is_tagged_object(value,"break_value");
}

function is_fallthrough_statement(stmt) {
	return is_tagged_object(stmt,"fallthrough");
}
function make_fallthrough_value(stmt, env) {
	return { tag: "fallthrough_value", line: stmt.line };
}
function is_fallthrough_value(value) {
	return is_tagged_object(value,"fallthrough_value");
}

function is_function_definition(stmt) {
	return is_tagged_object(stmt,"function_definition");
}
function function_definition_parameters(stmt) {
	return stmt.parameters;
}
function function_definition_body(stmt) {
	return stmt.body;
}
function function_definition_parent(stmt) {
	return stmt.parent;
}

function evaluate_function_definition(stmt, env) {
	let parent_name = function_definition_parent(stmt);
	if (parent_name) {
		// extends parent
		var parent = lookup_variable_value(null, parent_name, env);
		var parent_env = extend_environment([],[],function_value_environment(parent));
		evaluate(function_value_body(parent), parent_env);
		return make_function_value(
				 function_definition_parameters(stmt),
				 function_definition_body(stmt),
				 parent_env, true);
	}
	return make_function_value(
				 function_definition_parameters(stmt),
				 function_definition_body(stmt),
				 env, false);
}
function make_function_value(parameters, body, env, hasParent) {
	return { tag: "function_value",
				parameters: parameters,
				body: body,
				environment: env,
				has_parent: hasParent };
}
function is_compound_function_value(f) {
	return is_tagged_object(f,"function_value");
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
		if (is_return_value(first_stmt_value) ||
			is_continue_value(first_stmt_value) ||
			is_break_value(first_stmt_value))
			return first_stmt_value;
		else return evaluate_sequence(rest_statements(stmts),env);
	}
}

function is_application(stmt) {
	return is_tagged_object(stmt, "application");
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
		
function is_primitive_function(fun) {
	return is_tagged_object(fun, "primitive");
}
function primitive_implementation(fun) {
	return fun.implementation;
}
	 
function apply_in_underlying_javascript(prim, argument_list) {
	var argument_array = new Array();
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
	if (_length(vars) >= _length(vals))
		return enclose_by(make_frame(vars, vals), base_env);
	else if (_length(vars) < _length(vals))
		throwError(line || "?", "Too many arguments supplied: expect "+_length(vars)+", but "+_length(vals)+" given");
}

function update_environment(vars, vals, base_env) {
	if (!_is_empty(vars) && _length(vars) >= _length(vals)){
		// add var-val pair to env
		first_frame(base_env)[_head(vars)] = _is_empty(vals) ? null : _head(vals);
		return update_environment(_tail(vars), _tail(vals), base_env);
	}
	else if (_is_list(vars) && _is_list(vals) && _length(vars) < _length(vals))
		throwError("?", "Too many arguments supplied: expect "+_length(vars)+", but "+_length(vals)+" given");
}
	 
function is_return_statement(stmt) {
	return is_tagged_object(stmt, "return_statement");
}
function return_statement_expression(stmt) {
	return stmt.expression;
}
	
function make_return_value(line, content) {
	return { tag: "return_value", content: content, line: line};
}
function is_return_value(value) {
	return is_tagged_object(value, "return_value");
}
function return_value_content(value) {
	return value.content;
}
 
function apply(fun, args, line) {
	if (is_primitive_function(fun)) {
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
		// define_variable("this", func_env, func_env);
		let result = evaluate(function_value_body(fun), func_env);
		if (is_return_value(result)) {
			return return_value_content(result);
		}
	} else {
		throwError(line, "Unknown function type - APPLY: " + fun);
	}
	return null;
}

function apply_logic(fun_raw, args, env) {
	var oprnd1 = evaluate(_head(args), env);
	var oprnd2 = false;
	if ((fun_raw.name === "&&" && oprnd1 === true) ||
		(fun_raw.name === "||" && oprnd1 === false)) {
		oprnd2 = evaluate(_head(_tail(args)), env);
	}
	var fun = evaluate(fun_raw, env);
	var arg_list = _pair(oprnd1, _pair(oprnd2, _list()));
	return apply_in_underlying_javascript(primitive_implementation(fun), arg_list);
}

function apply_ternary(fun_raw, args, env) {
	if (_length(args) !== 3) {
		throwError("?", "Invalid conditional expression");
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

function is_reference(stmt) {
	return is_tagged_object(stmt, "reference");
}

function list_method(list, method) {
	switch (method) {
		case "head":
			return _head(list);
		case "tail":
			return _tail(list);
		case "isEmpty":
			return _is_empty(list);
		case "length":
			return _length(list);
		default:
		throwError("?", "Unknown list method: " + member);
	}
}

function refer(fun, member) {
	if (member.charAt(0) === "_"){
		throwError("?", "Referencing private members is not allowed.");
	}
	if (is_compound_function_value(fun)) {
		let func_env = extend_environment([],[],function_value_environment(fun));
		if (function_value_body(fun)) {
			// evaluate function body to update environment
			evaluate(function_value_body(fun), func_env);
		}
		return lookup_variable_value(null, member, func_env);
	} else if (member === "isList") {
		return _is_list(fun);
	} else if (_is_list(fun)) {
		return list_method(fun, member);
	} else {
		throwError("?", "Unknown function type - REFER: " + fun);
	}
}

function list_of_values(exps, env) {
	if (no_operands(exps)) return [];
	else return _pair(evaluate(first_operand(exps), env),
						  list_of_values(rest_operands(exps), env));
}
	 
var primitive_functions = {
		"$pair": _pair,
		"$head": _head,
		"$tail": _tail,
		"$list": _list,
		"$is_list": _is_list,
		"$is_empty": _is_empty,
		
		"put": _put,
		"print": _print,
		"input": _input,

		"$now": _now,
		"$string_to_char_list": _string_to_char_list,
		"$char_code": _char_code,
		
		"_-": (x) => -x, // negative
		"**": (x,y) => Math.pow(x,y), // power 
		"+": (x,y) => x + y,
		"-": (x,y) => x - y,
		"*": (x,y) => x * y,
		"/": (x,y) => Math.trunc(x / y),
		"/.": (x,y) => x / y,
		"%": (x,y) => x % y,
		"==": (x,y) => x === y,
		"!=": (x,y) => x !== y,
		"<": (x,y) => x < y,
		"<=": (x,y) => x <= y,
		">": (x,y) => x > y,
		">=": (x,y) => x >= y,
		"_!": (x) => ! x, // not
		"&&": (x,y) => x && y,
		"||": (x,y) => x || y,
		
		"&": (x,y) => x & y,
		"|": (x,y) => x | y,
		"_~": (x) => ~x, // NOT
		"^": (x,y) => x ^ y,
		"<<": (x,y) => x << y,
		">>": (x,y) => x >> y,
		">>>": (x,y) => x >>> y,
		
		"throw": (x) => { throw Error(x); }
};
	
function setup_environment() {
	var initial_env = enclose_by(an_empty_frame, the_empty_environment);
	for (var prop in primitive_functions) {
		define_variable(prop,
							 { tag: "primitive",
								implementation: primitive_functions[prop] },
							 initial_env);
	}
	define_variable("undefined", undefined, initial_env);
	return initial_env;
}
	 
function evaluate_toplevel(stmt, env) {
	var value = evaluate(stmt, env);
	if (is_return_value(value))
		throwError(value.line, "return not allowed outside of function definition.");
	if (is_continue_value(value))
		throwError(value.line, "Invalid continue statement.");
	if (is_break_value(value))
		throwError(value.line, "Invalid break statement.");
	else return value;
}

function evaluate(stmt, env) {
	// console.log(`[EVAL] ${stmt.line}`);
	if (is_self_evaluating(stmt)) 
		return stmt;
	else if (is_variable(stmt))
		return lookup_variable_value(stmt, variable_name(stmt), env);
	else if (is_assignment(stmt)) 
		return evaluate_assignment(stmt, env);
	else if (is_var_definition(stmt)) 
		return evaluate_var_definition(stmt, env);
	else if (is_if_statement(stmt))
		return evaluate_if_statement(stmt, env);
	else if (is_switch_statement(stmt))
		return evaluate_switch_statement(stmt, env);
	else if (is_while_statement(stmt))
		return evaluate_while_statement(stmt, env);
	else if (is_do_while_statement(stmt))
		return evaluate_do_while_statement(stmt, env);
	else if (is_for_statement(stmt))
		return evaluate_for_statement(stmt, env);
	else if (is_continue_statement(stmt))
		return make_continue_value(stmt, env);
	else if (is_break_statement(stmt))
		return make_break_value(stmt, env);
	else if (is_fallthrough_statement(stmt))
		return make_fallthrough_value(stmt, env);
	else if (is_function_definition(stmt))
		return evaluate_function_definition(stmt, env);
	else if (is_sequence(stmt))
		return evaluate_sequence(stmt, env);
	else if (is_application(stmt)){
		var optr = operator(stmt);
		if (optr.name === "&&" || optr.name === "||"){
			// short-circuit evaluation
			return apply_logic(optr, operands(stmt), env);
		} else if (optr.name === ".") {
			// reference
			var oprnd = operands(stmt);
			var fun = _head(oprnd);
			var member = _head(_tail(oprnd));
			if (is_application(member)) {
				// reference function member
				return apply(refer(evaluate(fun, env), operator(member).name),
						list_of_values(operands(member), env), stmt.line);
			} else {
				// reference function field
				return refer(evaluate(fun,env), member.name);
			}
		} else if (optr.name === ":") {
			// ternary operator
			return apply_ternary(optr, operands(stmt), env);
		} else {
			return apply(evaluate(optr,env), list_of_values(operands(stmt), env), stmt.line);
		}
	} else if (is_return_statement(stmt)) {
		return make_return_value(stmt.line, 
					 evaluate(return_statement_expression(stmt), env));
	} else {
		throwError("?", "Unknown expression type - evaluate: " + stmt);
	}
}

function parse_program(program_string, program_parser, evaluate_callback) {
	if (program_string === null) {
		return {tag: "exit"};
	} else {
		if(program_parser) {
			program_parser(program_string, evaluate_callback, true);
		} else {
			alert("No parser available.");
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