class Token {
	constructor(type, value, line) {
		this.type = type;
		this.value = value;
		this.line = line;
	}
}

class Node {
	constructor(tag, line) {
		this.tag = tag;
		this.line = line;
	}
}

// Includs variable, operator
class VariableNode extends Node {
	constructor(name, type, line) {
		super("variable", line);
		this.name = name;
		this.type = type;
	}
}

class ConstantNode extends Node {
	constructor(value, line) {
		super("constant", line);
		this.value = value;
	}
}

class ApplicationNode extends Node {
	constructor(line) {
		super("application", line);
	}
	setOperator(value) {
		this.operator = value;
	}
	setOperands(value) {
		this.operands = value;
	}
}

class AssignmentNode extends Node {
	constructor(line) {
		super("assignment", line);
		this.returnLeft = false;
	}
	setLeft(value) {
		this.left = value;
	}
	setRight(value) {
		this.right = value;
	}
	setReturnLeft() {
		this.returnLeft = true;
	}
}

class VarDefNode extends Node {
	constructor(line) {
		super("var_definition", line);
	}
	setLeft(value) {
		this.left = value;
	}
	setRight(value) {
		this.right = value;
	}
}

class ReturnStatementNode extends Node {
	constructor(line, expression) {
		super("return_statement", line);
		this.expression = expression;
	}
}

class RangeNode extends Node {
	constructor(line) {
		super("range", line);
		this.closed = false;
	}
	
	setFrom(value) {
		this.from = value;
	}
	
	setTo(value) {
		this.to = value;
	}
	
	setClosed() {
		this.closed = true;
	}
}

class FuncDefNode extends Node {
	constructor(line) {
		super('function_definition', line);
	}
	
	setParent(value) {
		this.parent = value;
	}
	
	setParameters(value) {
		this.parameters = value;
	}
	
	setBody(value) {
		this.body = value;
	}
}