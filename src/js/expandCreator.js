function ExpandCreator() {}

ExpandCreator.prototype.group = function(rowNodes, groupByFields, groupAggFunction, expandByDefault) {
    console.log('i am in');
    for (i = 0; i < rowNodes.length; i++) {
        node = rowNodes[i];
        node.group = true;
        node.children = [{
            first: true,
            parent: node
        }];
        if (node.rows){
            for (var y = 1; y < node.rows; y++) {
                node.children.push({
                    first: false
                });
            };
        }
    }
    return rowNodes;
};

ExpandCreator.prototype.isExpanded = function(expandByDefault, level) {
    if (typeof expandByDefault === 'number') {
        return level < expandByDefault;
    } else {
        return expandByDefault === true || expandByDefault === 'true';
    }
};

module.exports = new ExpandCreator();
