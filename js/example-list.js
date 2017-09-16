let basic_example =
[
	{
		"title": "Basic",
		"url": "",
		"menu":[
		{
			"title": "Hello World",
			"url": "hello_world",
			"source": 'a := 2\n\nfunc double(n) {\n\treturn n * 2\n}\n\nfunc hello(n) {\n\tprint("Hello World! " + n)\n}\n\n// Recursive function\nfunc repeat(f, n) {\n\tif n {\n\t\tf(n)\n\t\trepeat(f, n-1)\n\t} else {\n\t\tprint("Done!")\n\t}\n}\n\nrepeat(hello, double(a))'
		},
		{
			"title": "Leap year",
			"url": "leap_year",
			"source": 'func isLeapYear(year){\n\treturn ((year % 4 == 0) && (year % 100 != 0)) ||\n\t\t\t(year % 400 == 0)\n}\n\nprint(isLeapYear(2020))'
		},
		{
			"title": "Fabonacci code",
			"url": "fabonacci_code",
			"source": '/*\n\tThe Fibonacci sequence is a series of numbers\n\twhere a number is found by adding up the two\n\tnumbers before it.\n\t1, 1, 2, 3, 5, 8, 13, 21, 34, and so forth.\n*/\n\nfunc fib(n) {\n\tif n < 2 { return n }\n\telse { return fib(n - 1) + fib(n - 2) }\n}\n\n// The naive version\n// Don\'t try numbers larger than 25\nprint("Fib(9) = " + fib(9))'
		},
		{
			"title": "Find factors",
			"url": "find_factors",
			"source": '/*\n\tFind factors of a Positive Integer\n*/\n\nfunc factor(n, i, res) {\n\tif i <= n/2 {\n\t\t// loop from 1 to n/2\n\t\tif n % i == 0 {\n\t\t\t// add found factor to result\n\t\t\tres = (i, res)\n\t\t}\n\t\treturn factor(n, i+1, res)\n\t} else {\n\t\t// add itself to result\n\t\treturn (n, res)\n\t}\n}\n\nfunc print_factors(n) {\n\tprint(factor(n, 1, []))\n}\n\nprint_factors(63)'
		},
		{
			"title": "Decimal to binary",
			"url": "decimal_binary",
			"source": '/*\n\tConvert decimal number to binary\n*/\nfunc dec_to_bin(n, res){\n\tif n == 0 { return res }\n\treturn dec_to_bin(n / 2, n % 2 + res)\n}\n\nfunc print_binary(n){\n\tvar result = dec_to_bin(n, "")\n\tprint(n + " in binary is:")\n\tprint(result || "0")\n}\n\nprint_binary(4457)'
		},
		{
			"title": "Insertion Sort",
			"url": "insertion_sort",
			"source": '/*\n\tInsertion sort\n*/\n\narr := [5,3,40,7,5,9,0,1,25]\n\nfunc sort(lst){\n\tfunc insert(a, l){ // num, list\n\t\tif l.isEmpty { return [a] }\n\t\tif a < l.head { return (a, l) }\n\t\treturn (l.head, insert(a, l.tail))\n\t}\n\n\tfunc help(l, n){ // left, new\n\t\tif l.isEmpty { return n } \n\t\tn = insert(l.head, n)\n\t\treturn help(l.tail, n)\n\t}\n\n\treturn help(lst, [])\n}\n\nprint(sort(arr))'
		},
		{
			"title": "List Manipulation",
			"url": "list_manipulation",
			"source": 'func init_list(n){\n\tif n == 0 { return [] }\n\telse { return (null, init_list(n-1)) }\n}\n\nfunc set(lst, n, v){\n\tif lst.isEmpty { return lst }\n\tif n == 0 { return (v, lst.tail) }\n\telse { return (lst.head, set(lst.tail, n-1, v)) }\n}\n\nfunc get(lst, n){\n\tif lst.isEmpty { return null }\n\tif n == 0 { return lst.head }\n\telse { return get(lst.tail, n-1) }\n}\n\nfunc length(lst){\n\treturn lst.isEmpty ? 0 : 1 + length(lst.tail)\n}\n\nmy_list := init_list(6)\nmy_list = set(set(set(my_list, 0, 5), 3, 7), 4, 2)\n\nprint("my_list = ", my_list)\nprint("length = ", length(my_list))\nprint("-------------------------------")\nprint("my_list[1]  = ", get(my_list, 1))\nprint("my_list[3]  = ", get(my_list, 3))\nprint("my_list[10] = ", get(my_list, 10))'
		},
		{
			"title": "Linked List",
			"url": "linked_list",
			"source": 'class Node {\n\tvar value = 0\n\tvar next\n\t@(v) { value = v }\n}\n\n// build a linked list\nvar head = Node(1)\nvar current = head\nfor i in 2..<10 {\n\tcurrent.next = Node(i)\n\tcurrent = current.next\n}\n\n/* Convert a linked list to a list, then print */\nfunc printList(head) {\n\tfunc help(head) {\n\t\tif !head { return [] }\n\t\treturn (head.value, help(head.next))\n\t}\n\tprint( help(head) )\n}\n\nprint( "Original linked list:" )\nprintList(head)\n\n/* Map a linked list, return a new linked list */\nfunc mapList(head, fun) {\n\tif !head { return null }\n\tvar thisHead = Node(fun(head.value))\n\tthisHead.next = mapList(head.next, fun)\n\treturn thisHead\n}\nvar newHead = mapList(head, func(a) { return a*2 })\nprint( "[Map] Times 2:" )\nprintList(newHead)\n\n/* Filter a linked list, return a new linked list */\nfunc filterList(head, fun) {\n\tif !head { return null }\n\tif fun(head.value) {\n\t\tvar thisHead = Node(head.value)\n\t\tthisHead.next = filterList(head.next, fun)\n\t\treturn thisHead\n\t} else {\n\t\treturn filterList(head.next, fun)\n\t}\n}\nnewHead = filterList(newHead, func(a) { return a >= 10 })\nprint( "[Filter] Larger than or equal to 10:" )\nprintList(newHead)\n\n/* Reduce a linked list */\nfunc reduceList(head, acc, fun) {\n\tif !head { return acc }\n\treturn reduceList(head.next, fun(acc, head.value), fun)\n}\nvar result = reduceList(newHead, 0, func(a, b) { return a+b })\nprint( "[Reduce] Sum all:" )\nprint( result )'
		},
		{
			"title": "Inheritance",
			"url": "inheritance",
			"source": 'import Math\n\nclass Shape {\n\tvar _name = "Shape"\n\tfunc getType() { return "Shape" }\n\tfunc setName(name) { _name = name }\n\tfunc getName() { return _name }\n\tfunc getArea() { return 0 }\n}\n\nclass Circle (Shape) {\n\tsetName("Circle")\n\tvar _radius = 1\n\tfunc setRadius(radius) { _radius = radius }\n\tfunc getArea() { return Math.round(Math.PI * _radius ** 2, 2) }\n}\n\nc := Circle()\nc.setRadius(2)\nprint( c.getName() + " area: " + c.getArea() )\n\nclass Rectangle (Shape) {\n\tsetName("Rectangle")\n\tvar _width = 0\n\tvar _height = 0\n\tfunc setWidth(width) { _width = width }\n\tfunc setHeight(height) { _height = height }\n\tfunc getArea() { return _width * _height }\n}\n\nr := Rectangle()\nr.setWidth(4)\nr.setHeight(10)\nprint( r.getName() + " area: " + r.getArea() )\n\nclass Square (Rectangle) {\n\tsetName("Square")\n\tfunc setSide(side) {\n\t\tsetWidth(side)\n\t\tsetHeight(side)\n\t}\n}\n\ns := Square()\ns.setSide(5)\nprint( s.getName() + " area: " + s.getArea() )\n\n/* output:\n\tCircle area: 12.57\n\tRectangle area: 40\n\tSquare area: 25\n*/'
		},
		{
			"title": "Memento Pattern",
			"url": "memento_pattern",
			"source": '/* Memento Design Pattern in YJLO Script\n * @author Liu Siwei\n * Original blog by Pankaj:\n * http://www.journaldev.com/1734/memento-design-pattern-java\n */\n\n/* Memento Pattern Originator Class */\nclass FileWriterUtil {\n\tclass _Memento {\n\t\tvar fileName\n\t\tvar content\n\t\t\n\t\t@(file_, content_) {\n\t\t\tfileName = file_\n\t\t\tcontent = content_\n\t\t}\n\t}\n\t\n\tvar _fileName\n\tvar _content = ""\n\t\n\t@(file) { _fileName = file }\n\t\n\tfunc toString() { return _content }\n\tfunc write(str) { _content += str }\n\tfunc save() { return _Memento(_fileName, _content) }\n\tfunc undoToLastSave(obj) {\n\t\tvar memento = obj\n\t\t_fileName = memento.fileName\n\t\t_content = memento.content\n\t}\n\t\n}\n\n/* Memento Pattern Caretaker Class */\nclass FileWriterCaretaker {\n\tvar _obj\n\t\n\tfunc save(fileWriter) { _obj = fileWriter.save() }\n\tfunc undo(fileWriter) { fileWriter.undoToLastSave(_obj) }\n}\n\n/* Test */\nvar caretaker = FileWriterCaretaker()\nvar fileWriter = FileWriterUtil("data.txt")\n\nfileWriter.write("First Set of Data\\n")\nprint(fileWriter.toString()+"\\n")\n\n// Save the file\ncaretaker.save(fileWriter)\n// Write something else\nfileWriter.write("Second Set of Data\\n")\n\n// Check file contents\nprint(fileWriter.toString()+"\\n")\n\n// Undo to last save\ncaretaker.undo(fileWriter)\n\n// Check file content again\nprint(fileWriter.toString())'
		}
		]
	}
];

let example_list =
[
	{
		"title": "LeetCode",
		"url": "LeetCode",
		"menu":[
		{
			"title": "1. Two sum",
			"url": "LeetCode_001_two_sum"
		},
		{
			"title": "2. Add two numbers",
			"url": "LeetCode_002_add_two_numbers"
		},
		{
			"title": "3. Longest substring without repeating characters",
			"url": "LeetCode_003_longest_substring_without_repeating_characters"
		}
		]
	}
];
