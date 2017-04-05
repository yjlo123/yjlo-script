var the_global_environment = null;
var the_empty_environment = [];
var an_empty_frame = {};

function is_tagged_object(stmt,the_tag) {
	return stmt 
			&& typeof stmt === "object" 
			&& stmt.tag === the_tag;
}
		
function is_self_evaluating(stmt) {
	return stmt === [] ||
	typeof stmt === "number" ||
	typeof stmt === "string" ||
	typeof stmt === "boolean";
}
		
function is_variable(stmt) {
	return is_tagged_object(stmt,"variable");
}
function variable_name(stmt) {
	return stmt.name;
}
		
function enclosing_environment(env) {
	return tail(env);
}
function first_frame(env) {
	return head(env);
}

function is_empty_environment(env) {
	return is_empty(env);
}
function enclose_by(frame,env) {
	return pair(frame,env);
}
	 
function lookup_variable_value(variable,env) {
	function env_loop(env) {
		if (is_empty_environment(env))
			throw new Error("Cannot find variable: "+variable);
		else if (has_binding_in_frame(variable,first_frame(env)))
			return first_frame(env)[variable];
		else return env_loop(enclosing_environment(env));
	}
	return env_loop(env);
}
	 
function is_assignment(stmt) {
	return is_tagged_object(stmt,"assignment");
}
function assignment_variable(stmt) {
	return stmt.variable;
}
function assignment_value(stmt) {
	return stmt.value;
}
	
function set_variable_value(variable,value,env) {
	function env_loop(env) {
		if (is_empty_environment(env))
			throw new Error("Cannot find variable: "+variable);
		else if (has_binding_in_frame(variable,first_frame(env)))
			add_binding_to_frame(variable,value,first_frame(env));
		else env_loop(enclosing_environment(env));
	}
	env_loop(env);
	return;
}
	 
function evaluate_assignment(stmt,env) {
	var value = evaluate(assignment_value(stmt),env);
	set_variable_value(assignment_variable(stmt),
							 value,
							 env);
	return value;
}
	 
function is_var_definition(stmt) {
	return is_tagged_object(stmt,"var_definition");
}
function var_definition_variable(stmt) {
	return stmt.variable;
}
function var_definition_value(stmt) {
	return stmt.value;
}
		
function make_frame(variables,values) {
	if (is_empty(variables) && is_empty(values)) 
		return {};
	else {
		var frame = make_frame(tail(variables),tail(values));
		frame[head(variables)] = head(values); // object field
															// assignment
		return frame;
	}
}
function add_binding_to_frame(variable,value,frame) {
	frame[variable] = value; // object field assignment
	return;
}
function has_binding_in_frame(variable,frame) {
	return frame.hasOwnProperty(variable);
}
	 
function define_variable(variable,value,env) {
	var frame = first_frame(env);
	return add_binding_to_frame(variable,value,frame);
}
	 
function evaluate_var_definition(stmt,env) {
	define_variable(var_definition_variable(stmt),
		evaluate(var_definition_value(stmt),env),
		env);
	return undefined;
}
	 
function is_if_statement(stmt) {
	return is_tagged_object(stmt,"if");
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
	return is_tagged_object(stmt,"switch");
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
	while ( !found_case && !is_empty(cases) ) {
		var result = null;
		if (is_in_list(evaluate(switch_variable(stmt), env), head(cases).value)){
			found_case = true;
			result = evaluate(head(cases).stmt, extend_environment([], [], env));
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
		cases = tail(cases);
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
	return x === false || x === 0 || x === "" 
	|| x === undefined || x === NaN || x === null || x.implementation === false;
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
	var extented_env = extend_environment([], [], env);
	var range_from_value = evaluate(for_range(stmt).from, env);
	define_variable(for_variable(stmt).name,
						range_from_value,
						extented_env);
	return evaluate_for_stmtement_clause(stmt, extented_env);
}

function evaluate_for_stmtement_clause(stmt, env) {
	var variable_value = evaluate(for_variable(stmt), env);
	var range_from_value = evaluate(for_range(stmt).from, env);
	var range_to_value = evaluate(for_range(stmt).to, env);
	var increment = for_increment(stmt) || (range_from_value < range_to_value ? 1 : -1);
	var increment_value = evaluate(increment, env);

	if ((increment_value > 0 && variable_value < range_to_value)
		|| (increment_value < 0 && variable_value > range_to_value)){
		var result = evaluate(for_consequent(stmt), env);
		if (is_return_value(result)){
			// encounter return statement in for loop
			return result;
		}
		if (is_break_value(result)){
			return null;
		}
		// increment
		set_variable_value(for_variable(stmt).name,
						variable_value + increment_value,
						env);
		return evaluate_for_stmtement_clause(stmt, env);
	}
}

function is_continue_statement(stmt) {
	return is_tagged_object(stmt,"continue");
}
function make_continue_value() {
	return { tag: "continue_value"};
}
function is_continue_value(value) {
	return is_tagged_object(value,"continue_value");
}

function is_break_statement(stmt) {
	return is_tagged_object(stmt,"break");
}
function make_break_value() {
	return { tag: "break_value"};
}
function is_break_value(value) {
	return is_tagged_object(value,"break_value");
}

function is_fallthrough_statement(stmt) {
	return is_tagged_object(stmt,"fallthrough");
}
function make_fallthrough_value() {
	return { tag: "fallthrough_value"};
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

function evaluate_function_definition(stmt,env) {
	if (function_definition_parent(stmt)) {
		// extends parent
		var parent = lookup_variable_value(function_definition_parent(stmt), env);
		var parent_env = extend_environment([],[],function_value_environment(parent));
		evaluate(function_value_body(parent), parent_env);
		return make_function_value(
				 function_definition_parameters(stmt),
				 function_definition_body(stmt),
				 parent_env);
	}
	return make_function_value(
				 function_definition_parameters(stmt),
				 function_definition_body(stmt),
				 env);
}
function make_function_value(parameters,body,env) {
	return { tag: "function_value",
				parameters: parameters,
				body: body,
				environment: env };
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
	return is_list(stmt);
}
function is_last_statement(stmts) {
	return is_empty(tail(stmts));
}
function first_statement(stmts) {
	return head(stmts);
}
function rest_statements(stmts) {
	return tail(stmts);
}
		
function evaluate_sequence(stmts,env) {
	if (is_last_statement(stmts))  
		return evaluate(first_statement(stmts),env);
	else {
		var first_stmt_value = evaluate(first_statement(stmts),env);
		if (is_return_value(first_stmt_value)
			|| is_continue_value(first_stmt_value)
			|| is_break_value(first_stmt_value))
			return first_stmt_value;
		else return evaluate_sequence(rest_statements(stmts),env);
	}
}

function is_application(stmt) {
	return is_tagged_object(stmt,"application");
}
function operator(stmt) {
	return stmt.operator;
}
function operands(stmt) {
	return stmt.operands;
}
function no_operands(ops) {
	return is_empty(ops);
}
function first_operand(ops) {
	return head(ops);
}
function rest_operands(ops) {
	return tail(ops);
}
		
function is_primitive_function(fun) {
	return is_tagged_object(fun,"primitive");
}
function primitive_implementation(fun) {
	return fun.implementation;
}
	 
function apply_in_underlying_javascript(prim,argument_list) {
	var argument_array = new Array();
	var i = 0;
	while (!is_empty(argument_list)) {
		argument_array[i++] = head(argument_list);
		argument_list = tail(argument_list);
	}
	return prim.apply(prim,argument_array);
}
	 
function primitive_implementation(fun) {
	return fun.implementation;
}
	 
function apply_primitive_function(fun,argument_list) {
	 return apply_in_underlying_javascript(primitive_implementation(fun),
														argument_list);
}

function extend_environment(vars,vals,base_env) {
	if (length(vars) === length(vals))
		return enclose_by(make_frame(vars,vals),base_env);
	else if (length(vars) < length(vals))
		throw new Error("Too many arguments supplied: "+vars+" "+vals);
	else
		throw new Error("Too few arguments supplied: "+vars+" "+vals);
}
	 
function is_return_statement(stmt) {
	return is_tagged_object(stmt,"return_statement");
}
function return_statement_expression(stmt) {
	return stmt.expression;
}
	
function make_return_value(content) {
	return { tag: "return_value", content: content };
}
function is_return_value(value) {
	return is_tagged_object(value,"return_value");
}
function return_value_content(value) {
	return value.content;
}
 
function apply(fun, args) {
	if (is_primitive_function(fun))
		return apply_primitive_function(fun, args);
	else if (is_compound_function_value(fun)) {
		var result =
			evaluate(function_value_body(fun),
						extend_environment(function_value_parameters(fun),
											args,
											function_value_environment(fun)));
		if (is_return_value(result)) 
			return return_value_content(result);
	} else throw new Error("Unknown function type - APPLY: "+fun);
}

function apply_logic(fun_raw, args, env) {
	var oprnd1 = evaluate(head(args), env);
	var oprnd2 = false;
	if ((fun_raw.name === "&&" && oprnd1 === true)
		|| (fun_raw.name === "||" && oprnd1 === false)) {
		oprnd2 = evaluate(head(tail(args)), env);
	}
	var fun = evaluate(fun_raw, env);
	var arg_list = pair(oprnd1, pair(oprnd2, list()));
	return apply_in_underlying_javascript(primitive_implementation(fun), arg_list);
}

function is_reference(stmt) {
	return is_tagged_object(stmt,"reference");
}
function refer(fun, member) {
	if (member.charAt(0) === "_"){
		throw new Error("Referencing private members is not allowed.");
	}
	if (is_compound_function_value(fun)) {
		var func_env = extend_environment([],[],function_value_environment(fun));
		if (function_value_body(fun)) {
			// evaluate function body to update environment
			evaluate(function_value_body(fun), func_env);
		}
		return lookup_variable_value(member,func_env);
	} else throw new Error("Unknown function type - REFER: "+fun);
}

function list_of_values(exps,env) {
	if (no_operands(exps)) return [];
	else return pair(evaluate(first_operand(exps),env),
						  list_of_values(rest_operands(exps),env));
}
	 
var primitive_functions = {
		pair: pair,
		head: head,
		tail: tail,
		list: list,
		is_list: is_list,
		is_empty: is_empty,
		length: length,
		display: display,
		print: print,
		newline: newline,
		runtime: runtime,
		error: error,

		floor: _floor,
		ceil: _ceil,
		trunc: _trunc,
		sqrt: _sqrt,
		round: _round,
		string_to_char_list: _string_to_char_list,

		true: true,
		false: false,
		
		"_-": function(x) { return -x; }, // negative
		"**": function(x,y) { return Math.pow(x,y)}, // power 
		"+": function(x,y) { return x + y; },
		"-": function(x,y) { return x - y; },
		"*": function(x,y) { return x * y; },
		"/": function(x,y) { return Math.trunc(x / y); },
		"/.": function(x,y) { return x / y; },
		"%": function(x,y) { return x % y; },
		"==": function(x,y) { return x === y; },
		"!=": function(x,y) { return x !== y; },
		"<": function(x,y) { return x < y; },
		"<=": function(x,y) { return x <= y; },
		">": function(x,y) { return x > y; },
		">=": function(x,y) { return x >= y; },
		"_!": function(x) { return ! x; }, // not
		"&&": function(x,y) { return x && y; },
		"||": function(x,y) { return x || y; },

		"&": function(x,y) { return x & y; },
		"|": function(x,y) { return x | y; },
		"_~": function(x) { return ~x; }, // NOT
		"^": function(x,y) { return x ^ y; },
		"<<": function(x,y) { return x << y; },
		">>": function(x,y) { return x >> y; },
		">>>": function(x,y) { return x >>> y; },
		
		"throw": function(x) { throw Error(x); }
};
	
function setup_environment() {
	var initial_env = enclose_by(an_empty_frame,the_empty_environment);
	for (var prop in primitive_functions) {
		define_variable(prop,
							 { tag: "primitive",
								implementation: primitive_functions[prop] },
							 initial_env);
	}
	define_variable("undefined",undefined,initial_env);
	return initial_env;
}
	 
function evaluate_toplevel(stmt,env) {
	var value = evaluate(stmt,env);
	if (is_return_value(value))
		throw new Error("return not allowed outside of function definition.");
	if (is_continue_value(value))
		throw new Error("Invalid continue statement.");
	if (is_break_value(value))
		throw new Error("Invalid break statement.");
	else return value;
}

function evaluate(stmt,env) {
	if (is_self_evaluating(stmt)) 
		return stmt;
	else if (is_variable(stmt)) 
		return lookup_variable_value(variable_name(stmt),env);
	else if (is_assignment(stmt)) 
		return evaluate_assignment(stmt,env);
	else if (is_var_definition(stmt)) 
		return evaluate_var_definition(stmt,env);
	else if (is_if_statement(stmt))
		return evaluate_if_statement(stmt,env);
	else if (is_switch_statement(stmt))
		return evaluate_switch_statement(stmt,env);
	else if (is_while_statement(stmt))
		return evaluate_while_statement(stmt,env);
	else if (is_do_while_statement(stmt))
		return evaluate_do_while_statement(stmt,env);
	else if (is_for_statement(stmt))
		return evaluate_for_statement(stmt,env);
	else if (is_continue_statement(stmt))
		return make_continue_value(stmt,env);
	else if (is_break_statement(stmt))
		return make_break_value(stmt,env);
	else if (is_fallthrough_statement(stmt))
		return make_fallthrough_value(stmt,env);
	else if (is_function_definition(stmt))
		return evaluate_function_definition(stmt,env);
	else if (is_sequence(stmt))
		return evaluate_sequence(stmt,env);
	else if (is_application(stmt)){
		var optr = operator(stmt);
		if (optr.name === "&&" || optr.name === "||"){
			// short-circuit evaluation
			return apply_logic(optr, operands(stmt), env);
		} else if (optr.name === ".") {
			// reference
			var oprnd = operands(stmt);
			var fun = head(oprnd);
			var member = head(tail(oprnd));
			if (is_application(member)) {
				// reference function member
				return apply(refer(evaluate(fun, env), operator(member).name),
						list_of_values(operands(member), env));
			} else {
				return refer(evaluate(fun,env), member.name);
			}
		} else {
			return apply(evaluate(optr,env), list_of_values(operands(stmt),env));
		}
	} else if (is_return_statement(stmt))
		return make_return_value(
					 evaluate(return_statement_expression(stmt), env));
	else throw new Error("Unknown expression type - - evaluate: "+stmt);
}

function parse_program(program_string, program_parser, evaluate_callback) {
	if (program_string === null) {
		return {tag: "exit"};
	} else {
		if(program_parser){
			program_parser(program_string, evaluate_callback);
		}else{
			alert("No parser available.");
		}
	}
}
	 
function driver_loop(program_string, program_parser, finish_callback) {

	parse_program(program_string, program_parser, function(syntax_tree){
		if(debug){
			console.log(JSON.stringify(syntax_tree,null,4));
		}
		if (is_tagged_object(syntax_tree,"exit")) return "interpreter completed";
		var output = evaluate_toplevel(syntax_tree, the_global_environment);
		finish_callback();
	});
}

function add_constant(name, value){
	an_empty_frame[name] = value;
}

function setup_global_environment(){
	an_empty_frame = {};
	the_global_environment = setup_environment();
	
	add_constant('null', null);
	add_constant('pi', 3.141592653589793);
}