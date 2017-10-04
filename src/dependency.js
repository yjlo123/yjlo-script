/* Resolve dependencies in sources
* return concatenated tokens
*/
var resolveDependency = function(sources) {
	var dependencyNode = function(data) {
		this.data = data;
		this.dependency = [];
	};
	
	// build dependency graph
	var dependencyGraph = {};
	sources.forEach(function(source){
		if (!dependencyGraph.hasOwnProperty(source.name)){
			dependencyGraph[source.name] = new dependencyNode(source);
			dependencyGraph[source.name].dependency = source.dependency;
		}
	});
	
	var resolve = function (node, unresolved){
		unresolved.push(node);
		var dependencies = dependencyGraph[node].dependency;
		while (!_is_empty(dependencies)) {
			var edge = _head(dependencies);
			if (resolved.indexOf(edge) === -1) {
				if (unresolved.indexOf(edge) !== -1) {
					throwError(null, 'Circular dependency detected: '+node+' -> '+edge);
				}
				resolve(edge, unresolved);
			}
			dependencies = _tail(dependencies);
		}
		resolved.push(node);
		// remove from unresolved
		var index = unresolved.indexOf(node);
		if (index > -1) {
			unresolved.splice(index, 1);
		}
	};
	var resolved = [];
	resolve('self', []);

	var resolvedTokens = [];
	for (let i in resolved){
		// append source tokens
		resolvedTokens = resolvedTokens.concat(dependencyGraph[resolved[i]].data.tokens);
	}
	return resolvedTokens;
};