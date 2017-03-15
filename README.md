# YJLO Script
## Introduction

**YJLO Script** is a simple JavaScript-like programming language written in JavaScript. It is a scripting language with some convenient features borrowed from other languages such as Python and Swift.

## Syntax
**YJLO Script** has similar syntax as JavaScript with support for higher order functional programming. Semicolon separator at the end of each statement is mandatory.

### Comments
**YJLO Script** supports both line comments `//` and block comments `/* ... */`, likes other C-like languages.

### Identifiers
**YJLO Script** is a case-sensitive language. Identifiers start with a letter and may contain letters, digits, and underscores.  
The following examples are all valid identifiers:
```swift
a
count
sum2
Hello_World
isValid
```

### Scope
Unlike JavaScript (ES5 and older versions), **YJLO Script** is block-scoped. Every pair of braces `{ }` defines a new scope. Local variables declared in a scope are visible to its own scope as well as all sub-scopes, but invisible to its parent-scopes.
```swift
var a = 1;
func bar(){
	var a = 2;
	var b = 3;
	print(a); // output 2
	if (true) {
		print(b); // output 3
		var c = 4;
		print(c); // output 4
	}
	print(c); // Error: Cannot find variable: c
}
bar();
print(a); // output 1
print(b); // Error: Cannot find variable: b
```

## Operators
### Arithmetic Operators
- Addition `+`
- Subtraction `-`
- Multiplication `*`
- Integer division `/`
- Floating point number division `/.`
- Remainder `%`
- Power `**`
```swift
var a = 1 + 2;		// a equals 3; 
var b = 10 - 2;		// b equals 8;
var c = 5 * 2;		// c equals 10;
var d = 9 / 5;		// d equals 1;
var e = 9 /. 5;		// e equals 1.8;
var f = 9 % 5;		// f equals 4;
var g = 2 ** 3;		// g equals 8;
```

### Assignment Operator
variable_name = expression;
```swift
var a = 10;		// a <- 10
var b = a;		// b <- 10
var c = a + 2;		// c <- (10 + 2)
```

### Comparison Operators
- Equal `==`
- Not equal `!=`
- Less than `<`
- Less than or equal `<=`
- Greater than `>`
- Greater than or equal `>=`

### Logical Operators
- Logical NOT `!`	[TODO]
- Logical AND `&&`
- Logical OR `||`

### Bitwise Operators
[TODO]

### Increment and Decrement Operators
- Increment `++`
- Decrement `--`

### Compound Assignment Operators
- Add and assign `+=`
- Subtract and assign `-=`
- Multiply and assign `*=`
- Divide (integer) and assign `/=`
- Divide (float) and assign `/.=`
- Remainder and assign `%=`
- Power and assign `**=`

## Type
[TODO]

## Function
Functions can be passed as function parameters or returned by a function. Functions are only visible after its definition.
```swift
func foo() {
	var a = 5;
	return a + 2 * 3;
}
print(foo());	// output 11
```
```swift
func double(a) {
	return a * 2;
}

func apply_and_add1(fun, value){
	return fun(value) + 1;
}

var myFun = apply_and_add1;
print(myFun(double, 3));	// output 7
```

### Recursion
Function recursion is supported in **YJLO Script**.
```swift
func fib(n) {
	if (n < 2) return n;
	return fib(n - 1) + fib(n - 2);
}

print("Fib(9) = " + fib(9));
```

### Returning values
A function without a return statement returns `undefined` by default.

## Control Flow
Executing different pieces of code based on certain conditions.
### If Statement
Executing a set of statements only if a specified condition is true:
```swift
if (value > 0) {
	// do something
}
```
The if statement can provide an alternative set of statements, known as an else clause, for situations when the if condition is false. These statements are indicated by the else keyword:
```swift
if (value > 0) {
	// do something
} else {
	// do something else
}
```

Complex if statement:  
[TODO]

### Switch Statement
[TODO]

The brackets `()` around the condition expression after `if` or `switch` can be omitted.
```swift
if value > 0 {
	// do something
}
```

If there is only one statement in the `if` or `else` clause, the braces `{}` can be omitted.
```swift
if (value > 0)
	// single statement for if
else
	// single statement for else
```

>#### **Caveat** 
>Do not omit both `()` and `{}` at the same time.

## Loop
### While Loop
```swift
var i = 0;

while i < 10 {
	i++;
}

print(i);
```


### Do-while Loop
```swift
var i = 10;

do {
	i -= 2;
} while i > 0;

print(i);
```

### For Loop
**YJLO Script** provides a convenient `for loop statement` to loop through a block of code a number of times.  
The format is:
```
for ([variable name] in ([start value], [end value]) by [incement value]) { 
	/* Clause */ 
}
```
For example:
```swift
for i in (3,8) by 2 {
	print(i);
}

// output 3, 5, 7
```
The `by [increment value]` part can be omitted, and the default increment is `1` if `[start value]` is less than `[end value]`, otherwise is `-1`.
```swift
for i in (3,8) {
	print(i);
}

// output 3, 4, 5, 6, 7
```
```swift
for i in (5,0) {
	print(i);
}

// output 5, 4, 3, 2, 1
```
`[start value]` can be omitted, and the default value is 0.
```swift
for i in (5) {
	print(i);
}

// output 0, 1, 2, 3, 4
```
`[start value]`, `[end value]`, and `[increment value]` can be any valid expression that is evaluated to an integer value.
```swift
var a = 3;
for i in (a, a**2) by a-1 {
	print(i);
}

// output 3, 5, 7
```

Same as `if` statements, the `()` around the condition in `while`, `do-while` and `for` statements can be omitted.  
`{}` can be omitted if there is only one statement in the clause.  

>#### **Caveat** 
>Do not omit both `()` and `{}` at the same time in `while` or `for` statements.