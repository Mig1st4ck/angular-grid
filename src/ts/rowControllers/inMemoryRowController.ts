/// <reference path="../utils.ts" />
/// <reference path="../constants.ts" />
/// <reference path="../groupCreator.ts" />
/// <reference path="../expandCreator.ts" />

module awk.grid {

    var utils = Utils;
    var constants = Constants;
    var groupCreator = GroupCreator.getInstance();
    var expandCreator = ExpandCreator.getInstance();

    export class InMemoryRowController {

        gridOptionsWrapper: any;
        columnModel: any;
        angularGrid: any;
        filterManager: any;
        $scope: any;
        expressionService: any;

        allRows: any;
        rowsAfterGroup: any;
        rowsAfterFilter: any;
        rowsAfterSort: any;
        rowsAfterMap: any;
        model: any;

        constructor() {
            this.createModel();
        }

        init(gridOptionsWrapper: any, columnModel: any, angularGrid: any, filterManager: any,
             $scope: any, expressionService: any) {
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.columnModel = columnModel;
            this.angularGrid = angularGrid;
            this.filterManager = filterManager;
            this.$scope = $scope;
            this.expressionService = expressionService;

            this.allRows = null;
            this.rowsAfterGroup = null;
            this.rowsAfterFilter = null;
            this.rowsAfterSort = null;
            this.rowsAfterMap = null;
        }

// private
        createModel() {
            var that = this;
            this.model = {
                // this method is implemented by the inMemory model only,
                // it gives the top level of the selection. used by the selection
                // controller, when it needs to do a full traversal
                getTopLevelNodes: function () {
                    return that.rowsAfterGroup;
                },
                getVirtualRow: function (index: any) {
                    return that.rowsAfterMap[index];
                },
                getVirtualRowCount: function () {
                    if (that.rowsAfterMap) {
                        return that.rowsAfterMap.length;
                    } else {
                        return 0;
                    }
                },
                forEachInMemory: function (callback: any) {
                    that.forEachInMemory(callback);
                }
            };
        }

// public
        getModel() {
            return this.model;
        }

// public
        forEachInMemory(callback: any) {

            // iterates through each item in memory, and calls the callback function
            function doCallback(list: any) {
                if (list) {
                    for (var i = 0; i < list.length; i++) {
                        var item = list[i];
                        callback(item);
                        if (item.group && item.group.children) {
                            doCallback(item.group.children);
                        }
                    }
                }
            }

            doCallback(this.rowsAfterGroup);
        }

// public
        updateModel(step: any) {

            // fallthrough in below switch is on purpose
            switch (step) {
                case constants.STEP_EVERYTHING:
                case constants.STEP_FILTER:
                    this.doFilter();
                    this.doAggregate();
                case constants.STEP_SORT:
                    this.doSort();
                case constants.STEP_MAP:
                    this.doGroupMapping();
            }

            if (typeof this.gridOptionsWrapper.getModelUpdated() === 'function') {
                this.gridOptionsWrapper.getModelUpdated()();
                var $scope = this.$scope;
                if ($scope) {
                    setTimeout(function () {
                        $scope.$apply();
                    }, 0);
                }
            }

        }

// private
        defaultGroupAggFunctionFactory(valueColumns: any, valueKeys: any) {

            return function groupAggFunction(rows: any) {

                var result = <any>{};

                if (valueKeys) {
                    for (var i = 0; i < valueKeys.length; i++) {
                        var valueKey = valueKeys[i];
                        // at this point, if no values were numbers, the result is null (not zero)
                        result[valueKey] = aggregateColumn(rows, constants.SUM, valueKey);
                    }
                }

                if (valueColumns) {
                    for (var j = 0; j < valueColumns.length; j++) {
                        var valueColumn = valueColumns[j];
                        var colKey = valueColumn.colDef.field;
                        // at this point, if no values were numbers, the result is null (not zero)
                        result[colKey] = aggregateColumn(rows, valueColumn.aggFunc, colKey);
                    }
                }

                return result;
            };

            function aggregateColumn(rows: any, aggFunc: any, colKey: any) {
                var resultForColumn: any = null;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var thisColumnValue = row.data[colKey];
                    // only include if the value is a number
                    if (typeof thisColumnValue === 'number') {

                        switch (aggFunc) {
                            case constants.SUM :
                                resultForColumn += thisColumnValue;
                                break;
                            case constants.MIN :
                                if (resultForColumn === null) {
                                    resultForColumn = thisColumnValue;
                                } else if (resultForColumn > thisColumnValue) {
                                    resultForColumn = thisColumnValue;
                                }
                                break;
                            case constants.MAX :
                                if (resultForColumn === null) {
                                    resultForColumn = thisColumnValue;
                                } else if (resultForColumn < thisColumnValue) {
                                    resultForColumn = thisColumnValue;
                                }
                                break;
                        }

                    }
                }
                return resultForColumn;
            }
        }

        // private
        getValue(data: any, colDef: any, node: any) {
            var api = this.gridOptionsWrapper.getApi();
            var context = this.gridOptionsWrapper.getContext();
            return utils.getValue(this.expressionService, data, colDef, node, api, context);
        }

        // public - it's possible to recompute the aggregate without doing the other parts
        doAggregate() {

            var groupAggFunction = this.gridOptionsWrapper.getGroupAggFunction();
            if (typeof groupAggFunction === 'function') {
                this.recursivelyCreateAggData(this.rowsAfterFilter, groupAggFunction);
                return;
            }

            var valueColumns = this.columnModel.getValueColumns();
            var valueKeys = this.gridOptionsWrapper.getGroupAggFields();
            if ((valueColumns && valueColumns.length > 0) || (valueKeys && valueKeys.length > 0)) {
                var defaultAggFunction = this.defaultGroupAggFunctionFactory(valueColumns, valueKeys);
                this.recursivelyCreateAggData(this.rowsAfterFilter, defaultAggFunction);
            } else {
                // if no agg data, need to clear out any previous items, when can be left behind
                // if use is creating / removing columns using the tool panel.
                // one exception - don't do this if already grouped, as this breaks the File Explorer example!!
                // to fix another day - how to we reset when the user provided the data??
                if (!this.gridOptionsWrapper.isRowsAlreadyGrouped()) {
                    this.recursivelyClearAggData(this.rowsAfterFilter);
                }
            }
        }

        // public
        expandOrCollapseAll(expand: any, rowNodes: any) {
            // if first call in recursion, we set list to parent list
            if (rowNodes === null) {
                rowNodes = this.rowsAfterGroup;
            }

            if (!rowNodes) {
                return;
            }

            var _this = this;
            rowNodes.forEach(function (node: any) {
                if (node.group) {
                    node.expanded = expand;
                    _this.expandOrCollapseAll(expand, node.children);
                }
            });
        }

        // private
        recursivelyClearAggData(nodes: any) {
            for (var i = 0, l = nodes.length; i < l; i++) {
                var node = nodes[i];
                if (node.group) {
                    // agg function needs to start at the bottom, so traverse first
                    this.recursivelyClearAggData(node.childrenAfterFilter);
                    node.data = null;
                }
            }
        }

        // private
        recursivelyCreateAggData(nodes: any, groupAggFunction: any) {
            for (var i = 0, l = nodes.length; i < l; i++) {
                var node = nodes[i];
                if (node.group) {
                    // agg function needs to start at the bottom, so traverse first
                    this.recursivelyCreateAggData(node.childrenAfterFilter, groupAggFunction);
                    // after traversal, we can now do the agg at this level
                    var data = groupAggFunction(node.childrenAfterFilter);
                    node.data = data;
                    // if we are grouping, then it's possible there is a sibling footer
                    // to the group, so update the data here also if there is one
                    if (node.sibling) {
                        node.sibling.data = data;
                    }
                }
            }
        }

        // private
        doSort() {
            var sorting: any;

            // if the sorting is already done by the server, then we should not do it here
            if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
                sorting = false;
            } else {
                //see if there is a col we are sorting by
                var sortingOptions = <any>[];
                this.columnModel.getAllColumns().forEach(function (column: any) {
                    if (column.sort) {
                        var ascending = column.sort === constants.ASC;
                        sortingOptions.push({
                            inverter: ascending ? 1 : -1,
                            sortedAt: column.sortedAt,
                            colDef: column.colDef
                        });
                    }
                });
                if (sortingOptions.length > 0) {
                    sorting = true;
                }
            }

            var rowNodesReadyForSorting = this.rowsAfterFilter ? this.rowsAfterFilter.slice(0) : null;

            if (sorting) {
                // The columns are to be sorted in the order that the user selected them:
                sortingOptions.sort(function (optionA: any, optionB: any) {
                    return optionA.sortedAt - optionB.sortedAt;
                });
                this.sortList(rowNodesReadyForSorting, sortingOptions);
            } else {
                // if no sorting, set all group children after sort to the original list.
                // note: it is important to do this, even if doing server side sorting,
                // to allow the rows to pass to the next stage (ie set the node value
                // childrenAfterSort)
                this.recursivelyResetSort(rowNodesReadyForSorting);
            }

            this.rowsAfterSort = rowNodesReadyForSorting;
        }

        // private
        recursivelyResetSort(rowNodes: any) {
            if (!rowNodes) {
                return;
            }
            for (var i = 0, l = rowNodes.length; i < l; i++) {
                var item = rowNodes[i];
                if (item.group && item.children) {
                    item.childrenAfterSort = item.childrenAfterFilter;
                    this.recursivelyResetSort(item.children);
                }
            }
        }

        // private
        sortList(nodes: any, sortOptions: any) {

            // sort any groups recursively
            for (var i = 0, l = nodes.length; i < l; i++) { // critical section, no functional programming
                var node = nodes[i];
                if (node.group && node.children) {
                    node.childrenAfterSort = node.childrenAfterFilter.slice(0);
                    this.sortList(node.childrenAfterSort, sortOptions);
                }
            }

            var that = this;

            function compare(objA: any, objB: any, colDef: any) {
                var valueA = that.getValue(objA.data, colDef, objA);
                var valueB = that.getValue(objB.data, colDef, objB);
                if (colDef.comparator) {
                    //if comparator provided, use it
                    return colDef.comparator(valueA, valueB, objA, objB);
                } else {
                    //otherwise do our own comparison
                    return utils.defaultComparator(valueA, valueB);
                }
            }

            nodes.sort(function (objA: any, objB: any) {
                // Iterate columns, return the first that doesn't match
                for (var i = 0, len = sortOptions.length; i < len; i++) {
                    var sortOption = sortOptions[i];
                    var compared = compare(objA, objB, sortOption.colDef);
                    if (compared !== 0) {
                        return compared * sortOption.inverter;
                    }
                }
                // All matched, these are identical as far as the sort is concerned:
                return 0;
            });
        }

        // private
        doGrouping() {
            var rowsAfterGroup: any;
            var groupedCols = this.columnModel.getGroupedColumns();
            var rowsAlreadyGrouped = this.gridOptionsWrapper.isRowsAlreadyGrouped();

            var doingGrouping = !rowsAlreadyGrouped && groupedCols.length > 0;

            if (doingGrouping) {
                var expandByDefault = this.gridOptionsWrapper.getGroupDefaultExpanded();
                rowsAfterGroup = groupCreator.group(this.allRows, groupedCols, expandByDefault);
            } else {
                rowsAfterGroup = this.allRows;
            }
            this.rowsAfterGroup = rowsAfterGroup;
        }

        // private
        doExpanding() {
            if (this.gridOptionsWrapper.isDoInternalExpanding()) {
                if (!this.gridOptionsWrapper.isRowsAlreadyExpanded()) {
                    var nodes: any[] = [];
                    for (var i = 0; i < this.allRows.length; i++) {
                        var node = this.allRows[i];
                        nodes[i] = {
                            data: node
                        };
                    }
                    this.allRows = nodes;
                    this.gridOptionsWrapper.gridOptions.rowsAlreadyGrouped = true;
                }
                this.rowsAfterGroup = expandCreator.group(this.allRows);
            }
        }

        // private
        doFilter() {
            var doingFilter: any;

            if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
                doingFilter = false;
            } else {
                var quickFilterPresent = this.angularGrid.getQuickFilter() !== null;
                var advancedFilterPresent = this.filterManager.isFilterPresent();
                doingFilter = quickFilterPresent || advancedFilterPresent;
            }

            var rowsAfterFilter: any;
            if (doingFilter) {
                rowsAfterFilter = this.filterItems(this.rowsAfterGroup, quickFilterPresent, advancedFilterPresent);
            } else {
                // do it here
                rowsAfterFilter = this.rowsAfterGroup;
                this.recursivelyResetFilter(this.rowsAfterGroup);
            }
            this.rowsAfterFilter = rowsAfterFilter;
        }

        // private
        filterItems(rowNodes: any, quickFilterPresent: any, advancedFilterPresent: any) {
            var result = <any>[];

            for (var i = 0, l = rowNodes.length; i < l; i++) {
                var node = rowNodes[i];

                if (node.group) {
                    // deal with group
                    node.childrenAfterFilter = this.filterItems(node.children, quickFilterPresent, advancedFilterPresent);
                    if (node.childrenAfterFilter.length > 0) {
                        node.allChildrenCount = this.getTotalChildCount(node.childrenAfterFilter);
                        result.push(node);
                    }
                } else {
                    if (this.doesRowPassFilter(node, quickFilterPresent, advancedFilterPresent)) {
                        result.push(node);
                    }
                }
            }

            return result;
        }

        // private
        recursivelyResetFilter(nodes: any) {
            if (!nodes) {
                return;
            }
            for (var i = 0, l = nodes.length; i < l; i++) {
                var node = nodes[i];
                if (node.group && node.children) {
                    node.childrenAfterFilter = node.children;
                    this.recursivelyResetFilter(node.children);
                    node.allChildrenCount = this.getTotalChildCount(node.childrenAfterFilter);
                }
            }
        }

        // private
        // rows: the rows to put into the model
        // firstId: the first id to use, used for paging, where we are not on the first page
        setAllRows(rows: any, firstId: any) {
            var nodes: any;
            if (this.gridOptionsWrapper.isRowsAlreadyGrouped()) {
                nodes = rows;
                this.recursivelyCheckUserProvidedNodes(nodes, null, 0);
            } else {
                // place each row into a wrapper
                var nodes = <any>[];
                if (rows) {
                    for (var i = 0; i < rows.length; i++) { // could be lots of rows, don't use functional programming
                        nodes.push({
                            data: rows[i]
                        });
                    }
                }
            }

            // if firstId provided, use it, otherwise start at 0
            var firstIdToUse = firstId ? firstId : 0;
            this.recursivelyAddIdToNodes(nodes, firstIdToUse);
            this.allRows = nodes;

            // aggregate here, so filters have the agg data ready
            this.doGrouping();
            // process here the expanded
            this.doExpanding();
        }

        // add in index - this is used by the selectionController - so quick
        // to look up selected rows
        recursivelyAddIdToNodes(nodes: any, index: any) {
            if (!nodes) {
                return;
            }
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                node.id = index++;
                if (node.group && node.children) {
                    index = this.recursivelyAddIdToNodes(node.children, index);
                }
            }
            return index;
        }

        // add in index - this is used by the selectionController - so quick
        // to look up selected rows
        recursivelyCheckUserProvidedNodes(nodes: any, parent: any, level: any) {
            if (!nodes) {
                return;
            }
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (parent) {
                    node.parent = parent;
                }
                node.level = level;
                if (node.group && node.children) {
                    this.recursivelyCheckUserProvidedNodes(node.children, node, level + 1);
                }
            }
        }

        // private
        getTotalChildCount(rowNodes: any) {
            var count = 0;
            for (var i = 0, l = rowNodes.length; i < l; i++) {
                var item = rowNodes[i];
                if (item.group) {
                    count += item.allChildrenCount;
                } else {
                    count++;
                }
            }
            return count;
        }

        // private
        doGroupMapping() {
            // even if not doing grouping, we do the mapping, as the client might
            // of passed in data that already has a grouping in it somewhere
            var rowsAfterMap = <any>[];
            this.addToMap(rowsAfterMap, this.rowsAfterSort);
            this.rowsAfterMap = rowsAfterMap;
        }

        // private
        addToMap(mappedData: any, originalNodes: any) {
            if (!originalNodes) {
                return;
            }
            for (var i = 0; i < originalNodes.length; i++) {
                var node = originalNodes[i];
                mappedData.push(node);
                if (node.group && node.expanded) {
                    this.addToMap(mappedData, node.childrenAfterSort);

                    // put a footer in if user is looking for it
                    if (this.gridOptionsWrapper.isGroupIncludeFooter()) {
                        var footerNode = this.createFooterNode(node);
                        mappedData.push(footerNode);
                    }
                }
            }
        }

        // private
        createFooterNode(groupNode: any) {
            var footerNode = <any>{};
            Object.keys(groupNode).forEach(function (key) {
                footerNode[key] = groupNode[key];
            });
            footerNode.footer = true;
            // get both header and footer to reference each other as siblings. this is never undone,
            // only overwritten. so if a group is expanded, then contracted, it will have a ghost
            // sibling - but that's fine, as we can ignore this if the header is contracted.
            footerNode.sibling = groupNode;
            groupNode.sibling = footerNode;
            return footerNode;
        }

        // private
        doesRowPassFilter(node: any, quickFilterPresent: any, advancedFilterPresent: any) {
            //first up, check quick filter
            if (quickFilterPresent) {
                if (!node.quickFilterAggregateText) {
                    this.aggregateRowForQuickFilter(node);
                }
                if (node.quickFilterAggregateText.indexOf(this.angularGrid.getQuickFilter()) < 0) {
                    //quick filter fails, so skip item
                    return false;
                }
            }

            //second, check advanced filter
            if (advancedFilterPresent) {
                if (!this.filterManager.doesFilterPass(node)) {
                    return false;
                }
            }

            //got this far, all filters pass
            return true;
        }

        // private
        aggregateRowForQuickFilter(node: any) {
            var aggregatedText = '';
            this.columnModel.getAllColumns().forEach(function (colDefWrapper: any) {
                var data = node.data;
                var value = data ? data[colDefWrapper.colDef.field] : null;
                if (value && value !== '') {
                    aggregatedText = aggregatedText + value.toString().toUpperCase() + "_";
                }
            });
            node.quickFilterAggregateText = aggregatedText;
        }
    }
}
