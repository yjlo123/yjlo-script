var debug = false;
var version = "v0.2.2";
var current_parser = make_parse();
	
var hello_world = 'var a = 2;\n\nfunc double(n) {\n\treturn n * 2;\n}\n\nfunc hello(n) {\n\tprint("Hello World! " + n);\n}\n\n// Recursive function\nfunc repeat(f, n) {\n\tif n {\n\t\tf(n);\n\t\trepeat(f, n-1);\n\t} else {\n\t\tprint("Done!");\n\t}\n}\n\nrepeat(hello, double(a));';
var leap_year = 'func isLeapYear(year){\n\treturn ((year % 4 == 0) && (year % 100 != 0))\n\t\t\t|| (year % 400 == 0);\n}\n\nprint(isLeapYear(2020));';
var fabonacci_code = '/*\n\tThe Fibonacci sequence is a series of numbers\n\twhere a number is found by adding up the two\n\tnumbers before it.\n\t1, 1, 2, 3, 5, 8, 13, 21, 34, and so forth.\n*/\n\nfunc fib(n) {\n\tif (n < 2)\n\t\treturn n;\n\telse\n\t\treturn fib(n - 1) + fib(n - 2);\n}\n\n// The naive version\n// Don\'t try numbers larger than 25\nprint("Fib(9) = " + fib(9));';
var find_factors = '/*\n\tFind factors of a Positive Integer\n*/\n\nfunc factor(n, i, res) {\n\tif i <= n/2 {\n\t\t// loop from 1 to n/2\n\t\tif n % i == 0 {\n\t\t\t// add found factor to result\n\t\t\tres = pair(i, res);\n\t\t}\n\t\treturn factor(n, i+1, res);\n\t} else {\n\t\t// add itself to result\n\t\treturn pair(n, res);\n\t}\n}\n\nfunc print_factors(n) {\n\tprint(factor(n, 1, list()));\n}\n\nprint_factors(63);';
var decimal_binary = '/*\n\tConvert decimal number to binary\n*/\nfunc dec_to_bin(n, res){\n\tif (n == 0) return res;\n\treturn dec_to_bin(n/2, n%2+res);\n}\n\nfunc print_binary(n){\n\tvar result = dec_to_bin(n, "");\n\tprint(n + " in binary is:");\n\tprint(result || "0");\n}\n\nprint_binary(4457);';
var insertion_sort = '/*\n\tInsertion sort\n*/\n\nvar arr = list(5,3,40,7,5,9,0,1,25);\n\nfunc sort(lst){\n\tfunc insert(a, l){ // num, list\n\t\tif (is_empty(l)) return list(a);\n\t\tif (a < head(l)) return pair(a, l);\n\t\treturn pair(head(l), insert(a, tail(l)));\n\t}\n\n\tfunc help(l, n){ // left, new\n\t\tif (is_empty(l)) return n;\n\t\tn = insert(head(l), n);\n\t\treturn help(tail(l), n);\n\t}\n\n\treturn help(lst, list());\n}\n\nprint(sort(arr));';
var list_manipulation = 'func init_list(n){\n\tif (n == 0) return list();\n\telse return pair(null, init_list(n-1));\n}\n\nfunc set(lst, n, v){\n\tif (is_empty(lst)) return lst;\n\tif (n == 0) return pair(v, tail(lst));\n\telse return pair(head(lst), set(tail(lst), n-1, v));\n}\n\nfunc get(lst, n){\n\tif (is_empty(lst)) return null;\n\tif (n == 0) return head(lst);\n\telse return get(tail(lst), n-1);\n}\n\nfunc length(lst){\n\tfunc count(l, c){\n\t\tif (is_empty(l)) return c;\n\t\treturn count(tail(l), c+1);\n\t}\n\treturn count(lst, 0);\n}\n\nvar my_list = init_list(6);\nmy_list = set(set(set(my_list, 0, 5), 3, 7), 4, 2);\n\nprint("my_list = ", my_list);\nprint("length = ", length(my_list));\nprint("-------------------------------");\nprint("my_list[1]  = ", get(my_list, 1));\nprint("my_list[3]  = ", get(my_list, 3));\nprint("my_list[10] = ", get(my_list, 10));';
var linked_list = 'func Node(v) {\n\tvar _value = 0;\n\tvar _next = null;\n\t_value = v;\n\tfunc setNext(next) { _next = next; }\n\tfunc next() { return _next; }\n\tfunc setValue(value) { _value = value; }\n\tfunc value() { return _value; }\n\treturn func(){};\n}\n\n// build a linked list\nvar head = Node(1);\nvar current = head;\nfor i in (2, 10) {\n\tcurrent.setNext( Node(i) );\n\tcurrent = current.next();\n}\n\n/* Convert a linked list to a list, then print */\nfunc printList(head) {\n\tfunc help(head) {\n\t\tif !head { return list(); }\n\t\treturn pair(head.value(), help(head.next()));\n\t}\n\tprint( help(head) );\n}\n\nprint( "Original linked list:" );\nprintList(head);\n\n/* Map a linked list, return a new linked list */\nfunc mapList(head, fun) {\n\tif !head { return null; }\n\tvar thisHead = Node(fun(head.value()));\n\tthisHead.setNext(mapList(head.next(), fun));\n\treturn thisHead;\n}\nvar newHead = mapList(head, func(a) { return a*2; });\nprint( "[Map] Times 2:" );\nprintList(newHead);\n\n/* Filter a linked list, return a new linked list */\nfunc filterList(head, fun) {\n\tif !head { return null; }\n\tif fun(head.value()) {\n\t\tvar thisHead = Node(head.value());\n\t\tthisHead.setNext(filterList(head.next(), fun));\n\t\treturn thisHead;\n\t} else {\n\t\treturn filterList(head.next(), fun);\n\t}\n}\nnewHead = filterList(newHead, func(a) { return a >= 10; });\nprint( "[Filter] Larger than or equal to 10:" );\nprintList(newHead);\n\n/* Reduce a linked list */\nfunc reduceList(head, acc, fun) {\n\tif !head { return acc; }\n\treturn reduceList(head.next(), fun(acc, head.value()), fun);\n}\nvar result = reduceList(newHead, 0, func(a, b) { return a+b; });\nprint( "[Reduce] Sum all:" );\nprint( result );';
var inheritance = 'func Shape() {\n\tvar _name = "Shape";\n\tfunc getType() { return "Shape"; }\n\tfunc setName(name) { _name = name; }\n\tfunc getName() { return _name; }\n\tfunc getArea() { return 0; }\n\treturn func(){};\n}\n\nfunc Circle() extends Shape {\n\tsetName("Circle");\n\tvar _radius = 1;\n\tfunc setRadius(radius) { _radius = radius; }\n\tfunc getArea() { return round(pi * _radius ** 2, 2); }\n\treturn func(){};\n}\n\nvar c = Circle();\nc.setRadius(2);\nprint( c.getName() + " area: " + c.getArea() );\n\nfunc Rectangle() extends Shape {\n\tsetName("Rectangle");\n\tvar _width = 0;\n\tvar _height = 0;\n\tfunc setWidth(width) { _width = width; }\n\tfunc setHeight(height) { _height = height; }\n\tfunc getArea() { return _width * _height; }\n\treturn func(){};\n}\n\nvar r = Rectangle();\nr.setWidth(4);\nr.setHeight(10);\nprint( r.getName() + " area: " + r.getArea() );\n\nfunc Square() extends Rectangle {\n\tsetName("Square");\n\tfunc setSide(side) { setWidth(side); setHeight(side); }\n\treturn func(){};\n}\n\nvar s = Square();\ns.setSide(5);\nprint( s.getName() + " area: " + s.getArea() );\n\n/* output:\n\tCircle area: 12.57\n\tRectangle area: 40\n\tSquare area: 25\n*/';
var memento_pattern = '/* Memento Design Pattern in YJLO Script\n * @author Liu Siwei\n * Original blog by Pankaj:\n * http://www.journaldev.com/1734/memento-design-pattern-java\n */\n\n/* Memento Pattern Originator Class */\nfunc FileWriterUtil(file) {\n\tfunc _Memento(file_, content_) {\n\t\tvar fileName = file_;\n\t\tvar content = content_;\n\t\treturn func(){};\n\t}\n\t\n\tvar _fileName = file;\n\tvar _content = "";\n\t\n\tfunc toString() { return _content; }\n\tfunc write(str) { _content += str; }\n\tfunc save() { return _Memento(_fileName, _content); }\n\tfunc undoToLastSave(obj) {\n\t\tvar memento = obj;\n\t\t_fileName = memento.fileName;\n\t\t_content = memento.content;\n\t}\n\t\n\treturn func(){};\n}\n\n/* Memento Pattern Caretaker Class */\nfunc FileWriterCaretaker() {\n\tvar _obj = null;\n\t\n\tfunc save(fileWriter) { _obj = fileWriter.save(); }\n\tfunc undo(fileWriter) { fileWriter.undoToLastSave(_obj); }\n\t\n\treturn func(){};\n}\n\n\n/* Test */\nvar caretaker = FileWriterCaretaker();\nvar fileWriter = FileWriterUtil("data.txt");\n\nfileWriter.write("First Set of Data\\n");\nprint(fileWriter.toString()+"\\n");\n\n// Save the file\ncaretaker.save(fileWriter);\n// Write something else\nfileWriter.write("Second Set of Data\\n");\n\n// Check file contents\nprint(fileWriter.toString()+"\\n");\n\n// Undo to last save\ncaretaker.undo(fileWriter);\n\n// Check file content again\nprint(fileWriter.toString());';

var samplecodes = [hello_world,
					leap_year,
					fabonacci_code,
					find_factors,
					decimal_binary,
					insertion_sort,
					list_manipulation,
					linked_list,
					inheritance,
					memento_pattern];

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
	$("#version").text(version);
	registerEventListeners();
});

function exec(){
	$("#program-result").html('<p class="output-finish">[Processing]</p>');
	setup_global_environment();
	var source = myCodeMirror.getValue();
	driver_loop(source, current_parser, function(){
		$("#program-result").append('<br/><p class="output-finish">[Finished]</p>');
	});
	
}

function run() {
	$("#program-result").empty();
	exec();
}

function registerEventListeners(){
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