var debug = false;
var current_parser = make_parse();
	
var hello_world = 'var a = 2;\n\nfunc double(n) {\n\treturn n * 2;\n}\n\nfunc hello(n) {\n\tprint("Hello World! " + n);\n}\n\n// Recursive function\nfunc repeat(f, n) {\n\tif n {\n\t\tf(n);\n\t\trepeat(f, n-1);\n\t} else {\n\t\tprint("Done!");\n\t}\n}\n\nrepeat(hello, double(a));';
var leap_year = 'func isLeapYear(year){\n\treturn ((year % 4 == 0) && (year % 100 != 0))\n\t\t\t|| (year % 400 == 0);\n}\n\nprint(isLeapYear(2020));';
var fabonacci_code = '/*\n\tThe Fibonacci sequence is a series of numbers\n\twhere a number is found by adding up the two\n\tnumbers before it.\n\t1, 1, 2, 3, 5, 8, 13, 21, 34, and so forth.\n*/\n\nfunc fib(n) {\n\tif (n < 2)\n\t\treturn n;\n\telse\n\t\treturn fib(n - 1) + fib(n - 2);\n}\n\n// The naive version\n// Don\'t try numbers larger than 25\nprint("Fib(9) = " + fib(9));';
var find_factors = '/*\n\tFind factors of a Positive Integer\n*/\n\nfunc factor(n, i, res) {\n\tif i <= n/2 {\n\t\t// loop from 1 to n/2\n\t\tif n % i == 0 {\n\t\t\t// add found factor to result\n\t\t\tres = pair(i, res);\n\t\t}\n\t\treturn factor(n, i+1, res);\n\t} else {\n\t\t// add itself to result\n\t\treturn pair(n, res);\n\t}\n}\n\nfunc print_factors(n) {\n\tprint(factor(n, 1, list()));\n}\n\nprint_factors(63);';
var decimal_binary = '/*\n\tConvert decimal number to binary\n*/\nfunc dec_to_bin(n, res){\n\tif (n == 0) return res;\n\treturn dec_to_bin(n/2, n%2+res);\n}\n\nfunc print_binary(n){\n\tvar result = dec_to_bin(n, "");\n\tprint(n + " in binary is:");\n\tprint(result || "0");\n}\n\nprint_binary(4457);';
var insertion_sort = '/*\n\tInsertion sort\n*/\n\nvar arr = list(5,3,40,7,5,9,0,1,25);\n\nfunc sort(lst){\n\tfunc insert(a, l){ // num, list\n\t\tif (is_empty(l)) return list(a);\n\t\tif (a < head(l)) return pair(a, l);\n\t\treturn pair(head(l), insert(a, tail(l)));\n\t}\n\n\tfunc help(l, n){ // left, new\n\t\tif (is_empty(l)) return n;\n\t\tn = insert(head(l), n);\n\t\treturn help(tail(l), n);\n\t}\n\n\treturn help(lst, list());\n}\n\nprint(sort(arr));';
var list_manipulation = 'func init_list(n){\n\tif (n == 0) return list();\n\telse return pair(null, init_list(n-1));\n}\n\nfunc set(lst, n, v){\n\tif (is_empty(lst)) return lst;\n\tif (n == 0) return pair(v, tail(lst));\n\telse return pair(head(lst), set(tail(lst), n-1, v));\n}\n\nfunc get(lst, n){\n\tif (is_empty(lst)) return null;\n\tif (n == 0) return head(lst);\n\telse return get(tail(lst), n-1);\n}\n\nfunc length(lst){\n\tfunc count(l, c){\n\t\tif (is_empty(l)) return c;\n\t\treturn count(tail(l), c+1);\n\t}\n\treturn count(lst, 0);\n}\n\nvar my_list = init_list(6);\nmy_list = set(set(set(my_list, 0, 5), 3, 7), 4, 2);\n\nprint("my_list = ", my_list);\nprint("length = ", length(my_list));\nprint("-------------------------------");\nprint("my_list[1]  = ", get(my_list, 1));\nprint("my_list[3]  = ", get(my_list, 3));\nprint("my_list[10] = ", get(my_list, 10));';

var samplecodes = [hello_world,
					leap_year,
					fabonacci_code,
					find_factors,
					decimal_binary,
					insertion_sort,
					list_manipulation];

var myCodeMirror = CodeMirror(document.getElementById("editor-area"), {
	value: hello_world,
	lineNumbers: true,
	smartIndent: true,
	indentUnit: 4,
	indentWithTabs: true,
	mode: "javascript",
	theme: "lesser-dark"
});

myCodeMirror.setSize("100%", "100%");

$(document).ready(function() {
	registerEventListeners();
});

function exec(){
	setup_global_environment();
	var source = myCodeMirror.getValue();
	driver_loop(source, current_parser);
	$("#program-result").append('<br/><p class="output-finish">[Finished]</p>');
}

function run() {
	$("#program-result").empty();
	if(debug){
		exec();
	}else{
		try {
			exec();
		}catch(err) {
			$("#program-result").append('<p class="output-error">'+err.message.replace(/\n/g, "<br />")+'</p>');
		}
	}
}

function registerEventListeners(){
	$( ".parser-option" ).click(function() {
		var index = $( ".parser-option" ).index( this );
		$("#current-parser").text($(this).text());
		if(index === 0){
			// yjlo parser
			current_parser = make_parse();
		}else{
			current_parser = null;
			console.log("Default Jison parser.")
		}
	});

	$( ".example-option" ).click(function() {
		var index = $( ".example-option" ).index( this );
		$("#current-example").text($(this).text());
		myCodeMirror.getDoc().setValue(samplecodes[index]);
		$("#program-result").empty();
	});
}

Mousetrap.bind(['ctrl+enter'], function(e) {
	run();
	return false;
});

myCodeMirror.setOption("extraKeys", {
	"Ctrl-Enter": function(instance) { run(); }
});