
module awk.grid {

    export class ExpandCreator {

        static theInstance: ExpandCreator;

        static getInstance() {
            if (!this.theInstance) {
                this.theInstance = new ExpandCreator();
            }
            return this.theInstance;
        }

        group(rowNodes: any, groupedCols?: any, expandByDefault?: any) {
            var node: any;
            for (var i = 0; i < rowNodes.length; i++) {
                node = rowNodes[i];
                node.group = true;
                node.children = [{
                    first: true,
                    parent: node
                }];
                if (node.rows) {
                    for (var y = 1; y < node.rows; y++) {
                        node.children.push({
                            first: false
                        });
                    };
                }
            }
            return rowNodes;
        }

        isExpanded(expandByDefault: any, level: any) {
            if (typeof expandByDefault === 'number') {
                return level < expandByDefault;
            } else {
                return expandByDefault === true || expandByDefault === 'true';
            }
        }
    }
}
