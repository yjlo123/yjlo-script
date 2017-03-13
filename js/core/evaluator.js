var the_global_environment = null;
var the_empty_environment = [];
var an_empty_frame = {};

function is_tagged_object(stmt,the_tag) {
	return typeof stmt === "object" &&
	stmt.tag === the_tag;
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
function is_while_statement(stmt) {
	return is_tagged_object(stmt,"while");
}

function is_true(x) {
	return ! is_false(x);
}
function is_false(x) {
	return x === false || x === 0 || x === "" 
	|| x === undefined || x === NaN || x === null || x.implementation === false;
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

function evaluate_while_statement(stmt, env) {
	if (is_true(evaluate(if_predicate(stmt), env))){
		evaluate(if_consequent(stmt), extend_environment([], [], env));
		return evaluate_while_statement(stmt, env);
	}
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
		
function evaluate_function_definition(stmt,env) {
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
		var first_stmt_value = 
			 evaluate(first_statement(stmts),env);
		if (is_return_value(first_stmt_value))
			 return first_stmt_value;
		else return evaluate_sequence(
							rest_statements(stmts),env);
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
	 
function apply(fun,arguments) {
	if (is_primitive_function(fun))
		return apply_primitive_function(fun,arguments);
	else if (is_compound_function_value(fun)) {
		var result =
			evaluate(function_value_body(fun),
						extend_environment(function_value_parameters(fun),
											arguments,
											function_value_environment(fun)));
		if (is_return_value(result)) 
			return return_value_content(result);
		else return undefined;
	} else throw new Error("Unknown function type - - APPLY: "+fun);
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
		
		int: to_int,
		true: true,
		false: false,
		
		"_-": function(x) { return -x; }, // negative
		"**": function(x,y) { return Math.pow(x,y)}, // power 
		"+": function(x,y) { return x + y; },
		"-": function(x,y) { return x - y; },
		"*": function(x,y) { return x * y; },
		"/": function(x,y) { return x / y; },
		"%": function(x,y) { return x % y; },
		"==": function(x,y) { return x === y; },
		"!=": function(x,y) { return x !== y; },
		"<": function(x,y) { return x < y; },
		"<=": function(x,y) { return x <= y; },
		">": function(x,y) { return x > y; },
		">=": function(x,y) { return x >= y; },
		"!": function(x) { return ! x; },
		"&&": function(x,y) { return x && y; },
		"||": function(x,y) { return x || y; }
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
		throw new Error("return not allowed outside of function definition");
	else return value;
}

var input_prompt = "/// M-Eval input:";
function prompt_and_parse() {
	var program_string = prompt(input_prompt);
	if (program_string === null) {
		 return {tag: "exit"};
	} else {
		 return parser.parse(program_string);
	}
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
	else if (is_while_statement(stmt))
		return evaluate_while_statement(stmt,env);
	else if (is_function_definition(stmt))
		return evaluate_function_definition(stmt,env);
	else if (is_sequence(stmt))
		return evaluate_sequence(stmt,env);
	else if (is_application(stmt))
		return apply(evaluate(operator(stmt),env),
					 list_of_values(operands(stmt),env));
	else if (is_return_statement(stmt))
		return make_return_value(
					 evaluate(return_statement_expression(stmt),
							  env));
	else throw new Error("Unknown expression type - - evaluate: "+stmt);
}

/* Alert result, unused */
function user_print(object) {
	if (is_compound_function_value(object))
		alert("Result: function with "+
				"parameters: " + format(object.parameters) +
				" body: " + format(object.body));
	else alert("Result: "+object);
}

function parse_program(program_string, program_parser) {
	if (program_string === null) {
		return {tag: "exit"};
	} else {
		if(program_parser){
			return program_parser(program_string);
		}else{
			return parser.parse(program_string);
		}
	}
}
	 
function driver_loop(program_string, program_parser) {
	// remove comments
	var program_string_without_comments = program_string.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
	
	var input_program = parse_program(program_string_without_comments, program_parser);
	if(debug){
		console.log(JSON.stringify(input_program,null,4));
	}

	if (is_tagged_object(input_program,"exit")) return "interpreter completed";
	var output = evaluate_toplevel(input_program, the_global_environment);
	return output;
}
"METACIRCULAR EVALUATOR LOADED";



function add_constant(name, value){
	an_empty_frame[name] = value;
}


function setup_global_environment(){
	an_empty_frame = {};
	the_global_environment = setup_environment();
	
	add_constant('null', null);
	add_constant('pi', 3.141592653589793);
}