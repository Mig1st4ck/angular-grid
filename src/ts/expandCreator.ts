
module awk.grid {

    export class ExpandCreator {

        static theInstance: ExpandCreator;

        static getInstance() {
            if (!this.theInstance) {
                this.theInstance = new ExpandCreator();
            }
            return this.theInstance;
        }

        group(rowNodes: any, defaultExapanded?: any, expandByDefault?: any) {
            var node: any;
            var call = (n: any) => { return n.rows || defaultExapanded; };
            if (typeof defaultExapanded === 'function') {
              call = defaultExapanded;
            }
            for (var i = 0; i < rowNodes.length; i++) {
                node = rowNodes[i];
                node.group = true;
                node.children = [{
                    first: true,
                    parent: node
                }];
                node.rows = call(node);
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
