var debug = false;
var version = 'v0.3.1';
var current_parser = YjloParser();


function getCodeUrl(path) {
	return 'https://raw.githubusercontent.com/yjlo123/yjlo-script/master/' + path;
}

function getCode(path) {
	$('#loading-source-icon').show();
	$.ajax(getCodeUrl(path))
	.done(function(code) {
		myCodeMirror.getDoc().setValue(code);
	})
	.fail(function() {
		jqconsole.Write('Loading source failed.\n', 'console-error');
	})
	.always(function() {
		$('#loading-source-icon').hide();
	});
}

var myCodeMirror = CodeMirror(document.getElementById('editor-area'), {
	value: debug?"":basic_example[0].menu[0].source,
	lineNumbers: true,
	smartIndent: true,
	indentUnit: 4,
	indentWithTabs: true,
	mode: 'javascript',
	theme: 'lesser-dark',
	autoCloseBrackets: true,
	matchBrackets: true,
	highlightSelectionMatches: {}
});

var syntaxTreeStr = '';
var jqconsole = $('#console').jqconsole();

$(document).ready(function () {
	$('.version').text(version);
	
	myCodeMirror.setSize('100%', '100%');

	jqconsole.Write('YJLO Script\n', 'console-gray');
	jqconsole.Write(version + '\n', 'console-gray');
	jqconsole.Write('Type :help to see available commands.\n', 'console-gray');
	jqconsole.SetPromptLabel('  ');

	setup_console_environment();
	var startPrompt = function () {
		// Start the prompt with history enabled.
		jqconsole.Prompt(true, function (input) {
			// Output input with the class jqconsole-output.
			if (input) {
				switch (input) {
					case ':ver':
						jqconsole.Write(version + '\n', 'console-gray');
						break;
					case ':help':
						jqconsole.Write(
							`:run\n  run the current program
:ver\n  show version
:clear\n  clear console
:reset\n  reset console enviroment
:tree\n  output the current program's syntax tree
`,
							'console-gray');
						break;
					case ':clear':
						jqconsole.Reset();
						break;
					case ':reset':
						setup_console_environment();
						break;
					case ':run':
						run();
						break;
					case ':tree':
						printSyntaxTree(myCodeMirror.getValue(), current_parser);
						break;
					default:
						driver_loop(input, current_parser, get_console_environment(), function (result) {
							jqconsole.Write('=> ' + _process_output([result]) + '\n', 'console-arrow');
							startPrompt();
							return;
						});
				}
			}
			startPrompt();
		});
	};

	// initial prompt
	startPrompt();
	
	var basic_example_counter = 0;
	function createList(html_list, arr, path, source, ul_start, ul_end) {
		html_list.push(ul_start?'<ul>':'');
		$.each(arr, function(i, val) {
			if (val.menu) {
				html_list.push('<li><a href="#">' + val.title+'</a>');
				createList(html_list, val.menu, path+val.url+'/', source, true, true);
			} else {
				if (source) {
					html_list.push('<li><a href="#" onclick="load_basic_example('+(basic_example_counter++)+')">' + val.title+'</a>');
				} else {
					html_list.push('<li><a href="#" onclick="getCode(\''+path+val.url+'\')">' + val.title+'</a>');
				}
			}
			html_list.push('</li>');
		});
		html_list.push(ul_end?'</ul>':'');
		return html_list;
	}

	let example_menu_html = createList([], basic_example, 'example/', true, true, false);
	example_menu_html = createList(example_menu_html, example_list, 'example/', false, false, true);
	$('#example-menu').append(example_menu_html.join(''));
	
	let libray_menu_html = createList([], library_list, 'library/', false, true, true);
	$('#library-menu').append(libray_menu_html.join(''));
	
	$(function() {
		$('#main-menu').smartmenus({
			mainMenuSubOffsetX: -1,
			mainMenuSubOffsetY: 4,
			subMenusSubOffsetX: 6,
			subMenusSubOffsetY: -6
		});
	});

});


function exec() {
	$('#processing-source-icon').show();
	jqconsole.Write('  \n', 'jqconsole-old-prompt');
	var startDate = new Date();
	setup_global_environment();
	var source = myCodeMirror.getValue();
	driver_loop(source, current_parser, the_global_environment, function () {
		// evaluation finished
		$('#processing-source-icon').hide();
		var endDate = new Date();
		var unit = 'ms';
		var time_used = (endDate.getTime() - startDate.getTime());
		if (time_used > 1000) {
			time_used /= 1000;
			unit = 's';
		}
		jqconsole.Write(`[Finished in ${time_used}${unit}]\n`, 'console-gray');
	});

}

function run() {
	try {
		exec();
	} catch (error) {
		if (debug) {
			console.error(error);
		} else {
			jqconsole.Write(error.message + '\n', 'console-error');
			$('#processing-source-icon').hide();
		}
	}
}

function printSyntaxTree(program_string, program_parser) {
	try {
		program_parser(program_string, function (syntax_tree) {
			if (debug) {
				// console.log(JSON.stringify(syntax_tree, null, 4));
			}
			syntaxTreeStr = '';
			printSyntaxTreeNode(syntax_tree, '');
			jqconsole.Write(syntaxTreeStr + `\n`, 'console-default');
		}, tokenizeAndDesugaring, false);
	} catch (error) {
		if (debug) {
			console.error(error);
		} else {
			jqconsole.Write(error.message + '\n', 'console-error');
		}
	}
}

function printSyntaxTreeNode(node, indent) {
	if (_is_list(node) && _is_empty(node)) return;
	if (_is_list(node)) {
		// print head and tail in the same level
		printSyntaxTreeNode(_head(node), indent);
		printSyntaxTreeNode(_tail(node), indent);
	} else if (typeof node === 'object') {
		if (!node) {
			// null
			syntaxTreeStr += (indent + node + `\n`);
			return;
		}
		if ('tag' in node) {
			// print tag first
			syntaxTreeStr += (indent + `${node.tag}\n`);
			indent += '  ';
		}
		
		let attr_count = Object.keys(node).length;
		let count = 1;
		for (let attr in node) {
			if (attr === 'line' || attr === 'tag') {
				count++;
				continue;
			}
			// member name
			syntaxTreeStr += (indent + `|-${attr}: `);
			// member value
			let next_node = node[attr];
			if (next_node && _is_list(next_node) && typeof _head(next_node) === 'string') {
				// replace \n with \\n
				next_node = _pair(_head(next_node).replace(/\n/g, '\\n'), _tail(next_node));
			}
			
			if (!next_node ||
				(!_is_list(next_node) && typeof next_node !== 'object')) {
				// print simple value in the same line
				syntaxTreeStr += (`${next_node}\n`);
			} else {
				// print complex value in a new line
				syntaxTreeStr += (`\n`);
				if ((_is_list(next_node) && _length(next_node) > 1 && _is_empty(_tail(next_node))) ||
					count === attr_count) {
					printSyntaxTreeNode(next_node, indent + '	');
				} else {
					printSyntaxTreeNode(next_node, indent + '|   ');
				}
			}
			count++;
		}
	} else {
		// function argument name or constant
		syntaxTreeStr += (indent + `'${node}'\n`);
	}
}

function load_basic_example(idx) {
	myCodeMirror.getDoc().setValue(basic_example[0].menu[idx].source);
}

Mousetrap.bind(['ctrl+enter'], function (e) {
	run();
	return false;
});

myCodeMirror.setOption('extraKeys', {
	'Ctrl-Enter': function (instance) {
		run();
	}
});
