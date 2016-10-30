var debug = false;
var current_parser = make_parse();
	
var hello_world = 'var a = 2;\n\nfunc double(n){\n\trtn n * 2;\n}\n\nfunc hello(n){\n\tprint("Hello World! " + n);\n}\n\n// Recursive function\nfunc repeat(f, n){\n\tif(n){\n\t\tf(n);\n\t\trepeat(f, n-1);\n\t}else{\n\t\tprint("Done!");\n\t}\n}\n\nrepeat(hello, double(a));';
var fabonacci_code = '/*\n\tThe Fibonacci sequence is a series of numbers\n\twhere a number is found by adding up the two\n\tnumbers before it.\n\t1, 1, 2, 3, 5, 8, 13, 21, 34, and so forth.\n*/\n\nfunc fib(n) {\n\tif (n < 2) {\n\t\trtn n;\n\t} else {\n\t\trtn fib(n - 1) + fib(n - 2);\n\t}\n}\n\n// The naïve version\n// Don\'t try numbers larger than 20\nprint("Fib(9) = " + fib(9));';
var find_factors = '/*\n\tFind factors of a Positive Integer\n*/\n\nfunc factor(n, b, i){\n\tif (i <= b){\n\t\tvar a = n % i;\n\t\tif(a == 0){\n\t\t\tprint(i);\n\t\t}\n\t\tfactor(n, b, i+1);\n\t}\n}\n\nfunc print_factors(n){\n\tfactor(n, n/2, 1);\n\tprint(n);\n}\n\nprint_factors(63);';
var decimal_binary = '/*\n\tConvert decimal number to binary\n*/\nfunc decimal_to_binary(n, res){\n\tif (n == 0){\n\t\trtn res;\n\t}\n\tvar remainder = n % 2;\n\tres = remainder + res;\n\trtn decimal_to_binary(int(n/2), res);\n}\n\nfunc print_binary(n){\n\tvar result = decimal_to_binary(n, "");\n\tprint(n + " in binary is:");\n\tif (result){\n\t\tprint(result);\n\t}else{\n\t\tprint("0");\n\t}\n}\n\nprint_binary(4356);';
var insertion_sort = '/*\n\tInsertion sort\n*/\n\nvar arr = list(5,3,40,7,5,9,0,1,25);\n\nfunc sort(lst){\n\tfunc insert(a, l){ // num, list\n\t\tif (is_empty(l)){\n\t\t\trtn list(a);\n\t\t}\n\t\tif (a < head(l)){\n\t\t\trtn pair(a, l);\n\t\t}\n\t\trtn pair(head(l), insert(a, tail(l)));\n\t}\n\n\tfunc help(l, n){ // left, new\n\t\tif (is_empty(l)){\n\t\t\trtn n;\n\t\t}\n\t\tn = insert(head(l), n);\n\t\trtn help(tail(l), n);\n\t}\n\n\trtn help(lst, list());\n}\n\nprint(sort(arr));\n';
var list_manipulation = 'func init_list(n){\n\tif (n == 0){\n\t\trtn list();\n\t} else {\n\t\trtn pair(null, init_list(n-1));\n\t}\n}\n\nfunc set(lst, n, v){\n\tif (is_empty(lst)){\n\t\trtn lst;\n\t}\n\tif (n == 0){\n\t\trtn pair(v, tail(lst));\n\t} else {\n\t\trtn pair(head(lst), set(tail(lst), n-1, v));\n\t}\n}\n\nfunc get(lst, n){\n\tif (is_empty(lst)){\n\t\trtn null;\n\t}\n\tif (n == 0){\n\t\trtn head(lst);\n\t} else {\n\t\trtn get(tail(lst), n-1);\n\t}\n}\n\nfunc length(lst){\n\tfunc count(l, c){\n\t\tif (is_empty(l)){\n\t\t\trtn c;\n\t\t}\n\t\trtn count(tail(l), c+1);\n\t}\n\trtn count(lst, 0);\n}\n\nvar my_list = init_list(6);\nmy_list = set(set(set(my_list, 0, 5), 3, 7), 4, 2);\n\nprint("my_list = ", my_list);\nprint("length = ", length(my_list));\nprint("-------------------------------");\nprint("my_list[1]  = ", get(my_list, 1));\nprint("my_list[3]  = ", get(my_list, 3));\nprint("my_list[10] = ", get(my_list, 10));';

var samplecodes = [hello_world,
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
	mode:	"javascript",
	theme: "lesser-dark"
});

myCodeMirror.setSize("100%", "100%");

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
};


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

Mousetrap.bind(['ctrl+enter'], function(e) {
	run();
	return false;
});

myCodeMirror.setOption("extraKeys", {
	"Ctrl-Enter": function(instance) { run(); }
});