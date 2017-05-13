# YJLO Script

**YJLO Script** is a simple programming language written in JavaScript. It is a scripting language with numerous convenient features.

## Example
```swift
class Greeting {
	var _targets;
	
	// constructor
	@(list) {
		_targets = list;
	}
	
	func sayHelloToAll() {
		var rest = _targets;
		while !$is_empty(rest) {
			print("Hello", $head(rest) + "!");
			rest = $tail(rest);
		}
	}
}

myGreeting := Greeting(["World", "JS", "YJLO"]);
myGreeting.sayHelloToAll();

/* OUTPUT
Hello World!
Hello JS!
Hello YJLO!
*/
```

## Features
- lightweight
- dynamic typing
- higher order functions
- closures
- function member reference
- classes and inheritance
- utility libraries
- online IDE and REPL

## Online Demo
* Latest
  * <https://yjlo123.github.io/yjlo-script/>
* Stable
  * <https://yjlo.xyz/js>

## Resources
* Documentation
  * <https://github.com/yjlo123/yjlo-script/wiki>

## Contributing
Contributions to YJLO Script are welcomed and encouraged!  
[Open an issue](https://github.com/yjlo123/yjlo-script/issues/new) if you find a bug or have a feature request.  
[Email me](mailto:liusiwei.yjlo@gmail.com) to ask any questions.  
Submit a [pull request](https://github.com/yjlo123/yjlo-script/pulls) if you want to contribute.

## License
YJLO Script is available under the permissive MIT license.