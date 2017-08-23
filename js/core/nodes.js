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

class CaseNode extends Node {
	constructor(line) {
		super("case", line);
	}
	setValue(value) {
		this.value = value;
	}
	setStmt(value) {
		this.stmt = value;
	}
}

class SwitchNode extends Node {
	constructor(line) {
		super("switch", line);
	}
	setVariable(value) {
		this.variable = value;
	}
	setCases(value) {
		this.cases = value;
	}
	setDefault(value) {
		this.default = value;
	}
}

class ConditionNode extends Node {
	constructor(type, line) {
		super(type, line);
	}
	setPredicate(value) {
		this.predicate = value;
	}
	setConsequent(value) {
		this.consequent = value;
	}
	setAlternative(value) {
		this.alternative = value;
	}
}
	
class IfNode extends ConditionNode {
	constructor(line) {
		super('if', line);
	}
}

class WhileNode extends ConditionNode {
	constructor(line) {
		super('while', line);
	}
}

class DoWhileNode extends ConditionNode {
	constructor(line) {
		super('do', line);
	}
}

class ForNode extends Node {
	constructor(line) {
		super("for", line);
	}
	setVariable(value) {
		this.variable = value;
	}
	setRange(value) {
		this.range = value;
	}
	setIncrement(value) {
		this.increment = value;
	}
	setConsequent(value) {
		this.consequent = value;
	}
}