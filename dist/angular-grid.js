(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Angular Grid
// Written by Niall Crosby
// www.angulargrid.com
//
// Version 1.10.0

(function() {

    // Establish the root object, `window` or `exports`
    var root = this;
    var Grid = require('./grid');

    // if angular is present, register the directive
    if (typeof angular !== 'undefined') {
        var angularModule = angular.module("angularGrid", []);
        angularModule.directive("angularGrid", function() {
            return {
                restrict: "A",
                controller: ['$element', '$scope', '$compile', AngularDirectiveController],
                scope: {
                    angularGrid: "="
                }
            };
        });
        angularModule.directive("agGrid", function() {
            return {
                restrict: "A",
                controller: ['$element', '$scope', '$compile', '$attrs', AngularDirectiveController],
                scope: true
            };
        });
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = angularGridGlobalFunction;
        }
        exports.angularGrid = angularGridGlobalFunction;
    }

    root.angularGrid = angularGridGlobalFunction;

    function AngularDirectiveController($element, $scope, $compile, $attrs) {
        var gridOptions;
        var quickFilterOnScope;
        if ($attrs) {
            // new directive of ag-grid
            var keyOfGridInScope = $attrs.agGrid;
            quickFilterOnScope = keyOfGridInScope + '.quickFilterText';
            gridOptions = $scope.$eval(keyOfGridInScope);
            if (!gridOptions) {
                console.warn("WARNING - grid options for Angular Grid not found. Please ensure the attribute ag-grid points to a valid object on the scope");
                return;
            }
        } else {
            // old directive of angular-grid
            console.warn("WARNING - Directive angular-grid is deprecated, you should use the ag-grid directive instead.");
            gridOptions = $scope.angularGrid;
            quickFilterOnScope = 'angularGrid.quickFilterText';
            if (!gridOptions) {
                console.warn("WARNING - grid options for Angular Grid not found. Please ensure the attribute angular-grid points to a valid object on the scope");
                return;
            }
        }

        var eGridDiv = $element[0];
        var grid = new Grid(eGridDiv, gridOptions, $scope, $compile, quickFilterOnScope);

        $scope.$on("$destroy", function() {
            grid.setFinished();
        });
    }

    // Global Function - this function is used for creating a grid, outside of any AngularJS
    function angularGridGlobalFunction(element, gridOptions) {
        // see if element is a query selector, or a real element
        var eGridDiv;
        if (typeof element === 'string') {
            eGridDiv = document.querySelector(element);
            if (!eGridDiv) {
                console.warn('WARNING - was not able to find element ' + element + ' in the DOM, Angular Grid initialisation aborted.');
                return;
            }
        } else {
            eGridDiv = element;
        }
        new Grid(eGridDiv, gridOptions, null, null);
    }

}).call(window);

},{"./grid":16}],2:[function(require,module,exports){
var SvgFactory = require('../svgFactory');
var utils = require('../utils');
var constants = require('../constants');
var svgFactory = new SvgFactory();

function groupCellRendererFactory(gridOptionsWrapper, selectionRendererFactory) {

    return function groupCellRenderer(params) {

        var eGroupCell = document.createElement('span');
        var node = params.node;

        var cellExpandable = node.group && !node.footer;
        if (cellExpandable) {
            addExpandAndContract(eGroupCell, params);
        }

        var checkboxNeeded = params.colDef && params.colDef.cellRenderer && params.colDef.cellRenderer.checkbox && !node.footer;
        if (checkboxNeeded) {
            var eCheckbox = selectionRendererFactory.createSelectionCheckbox(node, params.rowIndex);
            eGroupCell.appendChild(eCheckbox);
        }

        if (params.colDef && params.colDef.cellRenderer && params.colDef.cellRenderer.innerRenderer) {
            createFromInnerRenderer(eGroupCell, params, params.colDef.cellRenderer.innerRenderer);
        } else if (node.footer) {
            createFooterCell(eGroupCell, params);
        } else if (node.group) {
            createGroupCell(eGroupCell, params);
        } else {
            createLeafCell(eGroupCell, params);
        }

        // only do this if an indent - as this overwrites the padding that
        // the theme set, which will make things look 'not aligned' for the
        // first group level.
        if (node.footer || node.level > 0) {
            var paddingPx = node.level * 10;
            if (node.footer) {
                paddingPx += 10;
            } else if (!node.group) {
                paddingPx += 5;
            }
            eGroupCell.style.paddingLeft = paddingPx + 'px';
        }

        return eGroupCell;
    };

    function addExpandAndContract(eGroupCell, params) {

        var eExpandIcon = createGroupExpandIcon(true);
        var eContractIcon = createGroupExpandIcon(false);
        eGroupCell.appendChild(eExpandIcon);
        eGroupCell.appendChild(eContractIcon);

        eExpandIcon.addEventListener('click', expandOrContract);
        eContractIcon.addEventListener('click', expandOrContract);
        eGroupCell.addEventListener('dblclick', expandOrContract);

        showAndHideExpandAndContract(eExpandIcon, eContractIcon, params.node.expanded);

        // if parent cell was passed, then we can listen for when focus is on the cell,
        // and then expand / contract as the user hits enter or space-bar
        if (params.eGridCell) {
            params.eGridCell.addEventListener('keydown', function(event) {
                if (utils.isKeyPressed(event, constants.KEY_ENTER)) {
                    expandOrContract();
                    event.preventDefault();
                }
            });
        }

        function expandOrContract() {
            expandGroup(eExpandIcon, eContractIcon, params);
        }
    }

    function showAndHideExpandAndContract(eExpandIcon, eContractIcon, expanded) {
        utils.setVisible(eExpandIcon, !expanded);
        utils.setVisible(eContractIcon, expanded);
    }

    function createFromInnerRenderer(eGroupCell, params, renderer) {
        utils.useRenderer(eGroupCell, renderer, params);
    }

    function expandGroup(eExpandIcon, eContractIcon, params) {
        params.node.expanded = !params.node.expanded;
        params.api.onGroupExpandedOrCollapsed(params.rowIndex + 1);
        showAndHideExpandAndContract(eExpandIcon, eContractIcon, params.node.expanded);
    }

    function createGroupExpandIcon(expanded) {
        var eIcon;
        if (expanded) {
            eIcon = utils.createIcon('groupContracted', gridOptionsWrapper, null, svgFactory.createArrowRightSvg);
        } else {
            eIcon = utils.createIcon('groupExpanded', gridOptionsWrapper, null, svgFactory.createArrowDownSvg);
        }
        utils.addCssClass(eIcon, 'ag-group-expand');
        return eIcon;
    }

    // creates cell with 'Total {{key}}' for a group
    function createFooterCell(eGroupCell, params) {
        var textToDisplay = "Total " + getGroupName(params);
        var eText = document.createTextNode(textToDisplay);
        eGroupCell.appendChild(eText);
    }

    function getGroupName(params) {
        var cellRenderer = params.colDef.cellRenderer;
        if (cellRenderer && cellRenderer.keyMap
            && typeof cellRenderer.keyMap === 'object' && params.colDef.cellRenderer !== null) {
            var valueFromMap = cellRenderer.keyMap[params.node.key];
            if (valueFromMap) {
                return valueFromMap;
            } else {
                return params.node.key;
            }
        } else {
            return params.node.key;
        }
    }

    // creates cell with '{{key}} ({{childCount}})' for a group
    function createGroupCell(eGroupCell, params) {
        var groupName = getGroupName(params);

        var colDefOfGroupedCol = params.api.getColumnDef(params.node.field);
        if (colDefOfGroupedCol && typeof colDefOfGroupedCol.cellRenderer === 'function') {
            params.value = groupName;
            utils.useRenderer(eGroupCell, colDefOfGroupedCol.cellRenderer, params);
        } else {
            eGroupCell.appendChild(document.createTextNode(groupName));
        }

        // only include the child count if it's included, eg if user doing custom aggregation,
        // then this could be left out, or set to -1, ie no child count
        var suppressCount = params.colDef.cellRenderer && params.colDef.cellRenderer.suppressCount;
        if (!suppressCount && params.node.allChildrenCount >= 0) {
            eGroupCell.appendChild(document.createTextNode(" (" + params.node.allChildrenCount + ")"));
        }
    }

    // creates cell with '{{key}} ({{childCount}})' for a group
    function createLeafCell(eParent, params) {
        if (params.value) {
            var eText = document.createTextNode(' ' + params.value);
            eParent.appendChild(eText);
        }
    }
}

module.exports = groupCellRendererFactory;
},{"../constants":4,"../svgFactory":34,"../utils":39}],3:[function(require,module,exports){
var constants = require('./constants');
var utils = require('./utils');

function ColumnController() {
    this.listeners = [];
    this.createModel();
}

ColumnController.prototype.init = function(angularGrid, selectionRendererFactory, gridOptionsWrapper, expressionService) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.selectionRendererFactory = selectionRendererFactory;
    this.expressionService = expressionService;
};

ColumnController.prototype.createModel = function() {
    var that = this;
    this.model = {
        // used by:
        // + inMemoryRowController -> sorting, building quick filter text
        // + headerRenderer -> sorting (clearing icon)
        getAllColumns: function() {
            return that.allColumns;
        },
        // + rowController -> while inserting rows, and when tabbing through cells (need to change this)
        // need a newMethod - get next col index
        getDisplayedColumns: function() {
            return that.displayedColumns;
        },
        // + toolPanel
        getGroupedColumns: function() {
            return that.groupedColumns;
        },
        // used by:
        // + angularGrid -> for setting body width
        // + rowController -> setting main row widths (when inserting and resizing)
        getBodyContainerWidth: function() {
            return that.getTotalColWidth(false);
        },
        // used by:
        // + angularGrid -> setting pinned body width
        getPinnedContainerWidth: function() {
            return that.getTotalColWidth(true);
        },
        // used by:
        // + headerRenderer -> setting pinned body width
        getHeaderGroups: function() {
            return that.headerGroups;
        },
        // used by:
        // + api.getFilterModel() -> to map colDef to column, key can be colDef or field
        getColumn: function(key) {
            return that.getColumn(key);
        },
        // used by:
        // + rowRenderer -> for navigation
        getVisibleColBefore: function(col) {
            var oldIndex = that.visibleColumns.indexOf(col);
            if (oldIndex > 0) {
                return that.visibleColumns[oldIndex - 1];
            } else {
                return null;
            }
        },
        // used by:
        // + rowRenderer -> for navigation
        getVisibleColAfter: function(col) {
            var oldIndex = that.visibleColumns.indexOf(col);
            if (oldIndex < (that.visibleColumns.length - 1)) {
                return that.visibleColumns[oldIndex + 1];
            } else {
                return null;
            }
        },
        getDisplayNameForCol: function(column) {
            return that.getDisplayNameForCol(column);
        }
    };
};

ColumnController.prototype.getColumn = function(key) {
    for (var i = 0; i<this.allColumns.length; i++) {
        var colDefMatches = this.allColumns[i].colDef === key;
        var fieldMatches = this.allColumns[i].colDef.field === key;
        if (colDefMatches || fieldMatches) {
            return this.allColumns[i];
        }
    }
};

ColumnController.prototype.getDisplayNameForCol = function(column) {

    var colDef = column.colDef;
    var headerValueGetter = colDef.headerValueGetter;

    if (headerValueGetter) {
        var params = {
            colDef: colDef,
            api: this.gridOptionsWrapper.getApi(),
            context: this.gridOptionsWrapper.getContext()
        };

        if (typeof headerValueGetter === 'function') {
            // valueGetter is a function, so just call it
            return headerValueGetter(params);
        } else if (typeof headerValueGetter === 'string') {
            // valueGetter is an expression, so execute the expression
            return this.expressionService.evaluate(headerValueGetter, params);
        }

        return utils.getValue(this.expressionService, undefined, colDef, undefined, api, context);
    } else if (colDef.displayName) {
        console.warn("ag-grid: Found displayName " + colDef.displayName + ", please use headerName instead, displayName is deprecated.");
        return colDef.displayName;
    } else {
        return colDef.headerName;
    }
};

ColumnController.prototype.addListener = function(listener) {
    this.listeners.push(listener);
};

ColumnController.prototype.fireColumnsChanged = function() {
    for (var i = 0; i<this.listeners.length; i++) {
        this.listeners[i].columnsChanged(this.allColumns, this.groupedColumns);
    }
};

ColumnController.prototype.getModel = function() {
    return this.model;
};

// called by angularGrid
ColumnController.prototype.setColumns = function(columnDefs) {
    this.checkForDeprecatedItems(columnDefs);
    this.createColumns(columnDefs);
    this.createAggColumns();
    this.updateModel();
    this.fireColumnsChanged();
};

ColumnController.prototype.checkForDeprecatedItems = function(columnDefs) {
    if (columnDefs) {
        for (var i = 0; i<columnDefs.length; i++) {
            var colDef = columnDefs[i];
            if (colDef.group !== undefined) {
                console.warn('ag-grid: ' + colDef.field + ' colDef.group is deprecated, please use colDef.headerGroup');
                colDef.headerGroup = colDef.group;
            }
            if (colDef.groupShow !== undefined) {
                console.warn('ag-grid: ' + colDef.field + ' colDef.groupShow is deprecated, please use colDef.headerGroupShow');
                colDef.headerGroupShow = colDef.groupShow;
            }
        }
    }
};

// called by headerRenderer - when a header is opened or closed
ColumnController.prototype.headerGroupOpened = function(group) {
    group.expanded = !group.expanded;
    this.updateGroups();
    this.updateDisplayedColumns();
    this.angularGrid.refreshHeaderAndBody();
};

// called by toolPanel - when change in columns happens
ColumnController.prototype.onColumnStateChanged = function() {
    this.updateModel();
    this.angularGrid.refreshHeaderAndBody();
};

// called from API
ColumnController.prototype.hideColumns = function(colIds, hide) {
    for (var i = 0; i<this.allColumns.length; i++) {
        var idThisCol = this.allColumns[i].colId;
        var hideThisCol = colIds.indexOf(idThisCol) >= 0;
        if (hideThisCol) {
            this.allColumns[i].visible = !hide;
        }
    }
    this.onColumnStateChanged();
    this.fireColumnsChanged(); // to tell toolbar
};

ColumnController.prototype.updateModel = function() {
    this.updateVisibleColumns();
    this.updatePinnedColumns();
    this.buildGroups();
    this.updateGroups();
    this.updateDisplayedColumns();
};

// private
ColumnController.prototype.updateDisplayedColumns = function() {

    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        // if not grouping by headers, then pull visible cols
        this.displayedColumns = this.visibleColumns;
    } else {
        // if grouping, then only show col as per group rules
        this.displayedColumns = [];
        for (var i = 0; i < this.headerGroups.length; i++) {
            var group = this.headerGroups[i];
            group.addToVisibleColumns(this.displayedColumns);
        }
    }

};

// public - called from api
ColumnController.prototype.sizeColumnsToFit = function(gridWidth) {
    // avoid divide by zero
    if (gridWidth <= 0 || this.displayedColumns.length === 0) {
        return;
    }

    var columnStartWidth = 0; // will contain the starting total width of the cols been spread
    var colsToSpread = []; // all visible cols, except those with avoidSizeToFit
    var widthForSpreading = gridWidth; // grid width minus the columns we are not resizing

    // get the list of cols to work with
    for (var j = 0; j < this.displayedColumns.length ; j++) {
        if (this.displayedColumns[j].colDef.suppressSizeToFit === true) {
            // don't include col, and remove the width from teh available width
            widthForSpreading -= this.displayedColumns[j].actualWidth;
        } else {
            // include the col
            colsToSpread.push(this.displayedColumns[j]);
            columnStartWidth += this.displayedColumns[j].actualWidth;
        }
    }

    // if no width left over to spread with, do nothing
    if (widthForSpreading <= 0) {
        return;
    }

    var scale = widthForSpreading / columnStartWidth;
    var pixelsForLastCol = widthForSpreading;

    // size all cols except the last by the scale
    for (var i = 0; i < (colsToSpread.length - 1); i++) {
        var column = colsToSpread[i];
        var newWidth = parseInt(column.actualWidth * scale);
        column.actualWidth = newWidth;
        pixelsForLastCol -= newWidth;
    }

    // size the last by whats remaining (this avoids rounding errors that could
    // occur with scaling everything, where it result in some pixels off)
    var lastColumn = colsToSpread[colsToSpread.length - 1];
    lastColumn.actualWidth = pixelsForLastCol;

    // widths set, refresh the gui
    this.angularGrid.refreshHeaderAndBody();
};

// private
ColumnController.prototype.buildGroups = function() {
    // if not grouping by headers, do nothing
    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        this.headerGroups = null;
        return;
    }

    // split the columns into groups
    var currentGroup = null;
    this.headerGroups = [];
    var that = this;

    var lastColWasPinned = true;

    this.visibleColumns.forEach(function(column) {
        // do we need a new group, because we move from pinned to non-pinned columns?
        var endOfPinnedHeader = lastColWasPinned && !column.pinned;
        if (!column.pinned) {
            lastColWasPinned = false;
        }
        // do we need a new group, because the group names doesn't match from previous col?
        var groupKeyMismatch = currentGroup && column.colDef.headerGroup !== currentGroup.name;
        // we don't group columns where no group is specified
        var colNotInGroup = currentGroup && !currentGroup.name;
        // do we need a new group, because we are just starting
        var processingFirstCol = currentGroup === null;
        var newGroupNeeded = processingFirstCol || endOfPinnedHeader || groupKeyMismatch || colNotInGroup;
        // create new group, if it's needed
        if (newGroupNeeded) {
            var pinned = column.pinned;
            currentGroup = new headerGroup(pinned, column.colDef.headerGroup);
            that.headerGroups.push(currentGroup);
        }
        currentGroup.addColumn(column);
    });
};

// private
ColumnController.prototype.updateGroups = function() {
    // if not grouping by headers, do nothing
    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        return;
    }

    for (var i = 0; i < this.headerGroups.length; i++) {
        var group = this.headerGroups[i];
        group.calculateExpandable();
        group.calculateDisplayedColumns();
    }
};

// private
ColumnController.prototype.updateVisibleColumns = function() {
    this.visibleColumns = [];

    var needAGroupColumn = this.groupedColumns.length > 0
        && !this.gridOptionsWrapper.isGroupSuppressAutoColumn()
        && !this.gridOptionsWrapper.isGroupUseEntireRow();

    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();

    if (needAGroupColumn) {
        // if one provided by user, use it, otherwise create one
        var groupColDef = this.gridOptionsWrapper.getGroupColumnDef();
        if (!groupColDef) {
            groupColDef = {
                headerName: localeTextFunc('group','Group'),
                cellRenderer: {
                    renderer: "group"
                }
            };
        }
        // no group column provided, need to create one here
        var groupColumn = new Column(groupColDef, this.gridOptionsWrapper.getColWidth());
        this.visibleColumns.push(groupColumn);
    }

    for (var i = 0; i < this.allColumns.length; i++) {
        var column = this.allColumns[i];
        if (column.visible) {
            column.index = this.visibleColumns.length;
            this.visibleColumns.push(this.allColumns[i]);
        }
    }
};

// private
ColumnController.prototype.updatePinnedColumns = function() {
    var pinnedColumnCount = this.gridOptionsWrapper.getPinnedColCount();
    for (var i = 0; i < this.visibleColumns.length; i++) {
        var pinned = i < pinnedColumnCount;
        this.visibleColumns[i].pinned = pinned;
    }
};

// private
ColumnController.prototype.createColumns = function(columnDefs) {
    this.allColumns = [];
    var that = this;
    if (columnDefs) {
        for (var i = 0; i < columnDefs.length; i++) {
            var colDef = columnDefs[i];
            // this is messy - we swap in another col def if it's checkbox selection - not happy :(
            if (colDef === 'checkboxSelection') {
                colDef = that.selectionRendererFactory.createCheckboxColDef();
            }
            var width = that.calculateColInitialWidth(colDef);
            var column = new Column(colDef, width);
            that.allColumns.push(column);
        }
    }
};

// private
ColumnController.prototype.createAggColumns = function() {
    this.groupedColumns = [];
    var groupKeys = this.gridOptionsWrapper.getGroupKeys();
    if (!groupKeys || groupKeys.length <= 0) {
        return;
    }
    for (var i = 0; i < groupKeys.length; i++) {
        var groupKey = groupKeys[i];
        var column = this.getColumn(groupKey);
        if (!column) {
            column = this.createDummyColumn(groupKey);
        }
        this.groupedColumns.push(column);
    }
};

// private
ColumnController.prototype.createDummyColumn = function(field) {
    var colDef = {
        field: field,
        headerName: field,
        hide: false
    };
    var width = this.gridOptionsWrapper.getColWidth();
    var column = new Column(colDef, width);
    return column;
};

// private
ColumnController.prototype.calculateColInitialWidth = function(colDef) {
    if (!colDef.width) {
        // if no width defined in colDef, use default
        return this.gridOptionsWrapper.getColWidth();
    } else if (colDef.width < constants.MIN_COL_WIDTH) {
        // if width in col def to small, set to min width
        return constants.MIN_COL_WIDTH;
    } else {
        // otherwise use the provided width
        return colDef.width;
    }
};

// private
// call with true (pinned), false (not-pinned) or undefined (all columns)
ColumnController.prototype.getTotalColWidth = function(includePinned) {
    var widthSoFar = 0;
    var pinedNotImportant = typeof includePinned !== 'boolean';

    this.displayedColumns.forEach(function(column) {
        var includeThisCol = pinedNotImportant || column.pinned === includePinned;
        if (includeThisCol) {
            widthSoFar += column.actualWidth;
        }
    });

    return widthSoFar;
};

function headerGroup(pinned, name) {
    this.pinned = pinned;
    this.name = name;
    this.allColumns = [];
    this.displayedColumns = [];
    this.expandable = false; // whether this group can be expanded or not
    this.expanded = false;
}

headerGroup.prototype.addColumn = function(column) {
    this.allColumns.push(column);
};

// need to check that this group has at least one col showing when both expanded and contracted.
// if not, then we don't allow expanding and contracting on this group
headerGroup.prototype.calculateExpandable = function() {
    // want to make sure the group doesn't disappear when it's open
    var atLeastOneShowingWhenOpen = false;
    // want to make sure the group doesn't disappear when it's closed
    var atLeastOneShowingWhenClosed = false;
    // want to make sure the group has something to show / hide
    var atLeastOneChangeable = false;
    for (var i = 0, j = this.allColumns.length; i < j; i++) {
        var column = this.allColumns[i];
        if (column.colDef.headerGroupShow === 'open') {
            atLeastOneShowingWhenOpen = true;
            atLeastOneChangeable = true;
        } else if (column.colDef.headerGroupShow === 'closed') {
            atLeastOneShowingWhenClosed = true;
            atLeastOneChangeable = true;
        } else {
            atLeastOneShowingWhenOpen = true;
            atLeastOneShowingWhenClosed = true;
        }
    }

    this.expandable = atLeastOneShowingWhenOpen && atLeastOneShowingWhenClosed && atLeastOneChangeable;
};

headerGroup.prototype.calculateDisplayedColumns = function() {
    // clear out last time we calculated
    this.displayedColumns = [];
    // it not expandable, everything is visible
    if (!this.expandable) {
        this.displayedColumns = this.allColumns;
        return;
    }
    // and calculate again
    for (var i = 0, j = this.allColumns.length; i < j; i++) {
        var column = this.allColumns[i];
        switch (column.colDef.headerGroupShow) {
            case 'open':
                // when set to open, only show col if group is open
                if (this.expanded) {
                    this.displayedColumns.push(column);
                }
                break;
            case 'closed':
                // when set to open, only show col if group is open
                if (!this.expanded) {
                    this.displayedColumns.push(column);
                }
                break;
            default:
                // default is always show the column
                this.displayedColumns.push(column);
                break;
        }
    }
};

// should replace with utils method 'add all'
headerGroup.prototype.addToVisibleColumns = function(colsToAdd) {
    for (var i = 0; i < this.displayedColumns.length; i++) {
        var column = this.displayedColumns[i];
        colsToAdd.push(column);
    }
};

var colIdSequence = 0;

function Column(colDef, actualWidth, hide) {
    this.colDef = colDef;
    this.actualWidth = actualWidth;
    this.visible = !colDef.hide;
    // in the future, the colKey might be something other than the index
    if (colDef.colId) {
        this.colId = colDef.colId;
    }else if (colDef.field) {
        this.colId = colDef.field;
    } else {
        this.colId = '' + colIdSequence++;
    }
}

module.exports = ColumnController;

},{"./constants":4,"./utils":39}],4:[function(require,module,exports){
var constants = {
    STEP_EVERYTHING: 0,
    STEP_FILTER: 1,
    STEP_SORT: 2,
    STEP_MAP: 3,
    ASC: "asc",
    DESC: "desc",
    ROW_BUFFER_SIZE: 20,
    SORT_STYLE_SHOW: "display:inline;",
    SORT_STYLE_HIDE: "display:none;",
    MIN_COL_WIDTH: 10,

    KEY_TAB: 9,
    KEY_ENTER: 13,
    KEY_SPACE: 32,
    KEY_DOWN: 40,
    KEY_UP: 38,
    KEY_LEFT: 37,
    KEY_RIGHT: 39
};

// taken from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
// Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
// At least Safari 3+: "[object HTMLElementConstructor]"
var isChrome = !!window.chrome && !this.isOpera; // Chrome 1+
var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6

if (isOpera) {
    constants.BROWSER = 'opera';
} else if (isFirefox) {
    constants.BROWSER = 'firefox';
} else if (isSafari) {
    constants.BROWSER = 'safari';
} else if (isChrome) {
    constants.BROWSER = 'chrome';
} else if (isIE) {
    constants.BROWSER = 'ie';
}

var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
var isWindows = navigator.platform.toUpperCase().indexOf('WIN')>=0;
if (isMac) {
    constants.PLATFORM = 'mac';
} else if (isWindows) {
    constants.PLATFORM = 'win';
}

module.exports = constants;

},{}],5:[function(require,module,exports){
var utils = require('../utils');

function DragAndDropService() {
    document.addEventListener('mouseup', this.stopDragging.bind(this));
}

DragAndDropService.prototype.stopDragging = function() {
    if (this.dragItem) {
        this.setDragCssClasses(this.dragItem.eDragSource, false);
        this.dragItem = null;
    }
};

DragAndDropService.prototype.setDragCssClasses = function(eListItem, dragging) {
    utils.addOrRemoveCssClass(eListItem, 'ag-dragging', dragging);
    utils.addOrRemoveCssClass(eListItem, 'ag-not-dragging', !dragging);
};

DragAndDropService.prototype.addDragSource = function(eDragSource, dragSourceCallback, containerId) {

    this.setDragCssClasses(eDragSource, false);

    var mouseDown = false;
    var that = this;

    eDragSource.addEventListener('mousedown', function() {
        mouseDown = true;
    });

    eDragSource.addEventListener('mouseup', function() {
        mouseDown = false;
    });

    eDragSource.addEventListener('mouseout', function() {
        mouseDown = false;
    });

    eDragSource.addEventListener('mousemove', function() {
        if (mouseDown) {
            var alreadyDraggingThisItem = this.dragItem && this.dragItem.eDropSource === eDragSource;
            if (!alreadyDraggingThisItem) {
                that.startDragging(eDragSource, dragSourceCallback, containerId);
            }
        }
    });
};

DragAndDropService.prototype.startDragging = function(eDragSource, dragSourceCallback) {
    if (this.dragItem && this.dragItem.eDragSource === eDragSource) {
        return;
    }
    if (this.dragItem) {
        this.stopDragging();
    }
    var data;
    if (dragSourceCallback.getData) {
        data = dragSourceCallback.getData();
    }
    var containerId;
    if (dragSourceCallback.getContainerId) {
        containerId = dragSourceCallback.getContainerId();
    }

    this.dragItem = {
        eDragSource: eDragSource,
        data: data,
        containerId: containerId
    };
    this.setDragCssClasses(this.dragItem.eDragSource, true);
};

DragAndDropService.prototype.addDropTarget = function(eDropTarget, dropTargetCallback) {
    var mouseIn = false;
    var acceptDrag = false;
    var that = this;

    eDropTarget.addEventListener('mouseover', function() {
        if (!mouseIn) {
            mouseIn = true;
            if (that.dragItem) {
                acceptDrag = dropTargetCallback.acceptDrag(that.dragItem);
            } else {
                acceptDrag = false;
            }
        }
    });

    eDropTarget.addEventListener('mouseout', function() {
        if (acceptDrag) {
            dropTargetCallback.noDrop();
        }
        mouseIn = false;
        acceptDrag = false;
    });

    eDropTarget.addEventListener('mouseup', function() {
        // dragItem should never be null, checking just in case
        if (acceptDrag && that.dragItem) {
            dropTargetCallback.drop(that.dragItem);
        }
    });

};

module.exports = new DragAndDropService();
},{"../utils":39}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
function ExpressionService() {}

ExpressionService.prototype.evaluate = function(rule, params) {
};

function ExpressionService() {
    this.expressionToFunctionCache = {};
}

ExpressionService.prototype.evaluate = function (expression, params) {

    try {
        var javaScriptFunction = this.createExpressionFunction(expression);
        var result = javaScriptFunction(params.value, params.context, params.node,
            params.data, params.colDef, params.rowIndex, params.api);
        return result;
    } catch (e) {
        // the expression failed, which can happen, as it's the client that
        // provides the expression. so print a nice message
        console.error('Processing of the expression failed');
        console.error('Expression = ' + expression);
        console.error('Exception = ' + e);
        return null;
    }
};

ExpressionService.prototype.createExpressionFunction = function (expression) {
    // check cache first
    if (this.expressionToFunctionCache[expression]) {
        return this.expressionToFunctionCache[expression];
    }
    // if not found in cache, return the function
    var functionBody = this.createFunctionBody(expression);
    var theFunction = new Function('x, ctx, node, data, colDef, rowIndex, api', functionBody);

    // store in cache
    this.expressionToFunctionCache[expression] = theFunction;

    return theFunction;
};

ExpressionService.prototype.createFunctionBody = function (expression) {
    // if the expression has the 'return' word in it, then use as is,
    // if not, then wrap it with return and ';' to make a function
    if (expression.indexOf('return') >= 0) {
        return expression;
    } else {
        return 'return ' + expression + ';';
    }
};

module.exports = ExpressionService;

},{}],8:[function(require,module,exports){
var utils = require('./../utils');
var SetFilter = require('./setFilter');
var NumberFilter = require('./numberFilter');
var StringFilter = require('./textFilter');

function FilterManager() {}

FilterManager.prototype.init = function(grid, gridOptionsWrapper, $compile, $scope, expressionService, columnModel) {
    this.$compile = $compile;
    this.$scope = $scope;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.grid = grid;
    this.allFilters = {};
    this.expressionService = expressionService;
    this.columnModel = columnModel;
};

FilterManager.prototype.setFilterModel = function(model) {
    var that = this;
    if (model) {
        // mark the filters as we set them, so any active filters left over we stop
        var processedFields = Object.keys(model);
        utils.iterateObject(this.allFilters, function(key, filterWrapper) {
            var field = filterWrapper.column.colDef.field;
            utils.removeFromArray(processedFields, field);
            if (field) {
                var newModel = model[field];
                that.setModelOnFilterWrapper(filterWrapper.filter, newModel);
            } else {
                console.warn('Warning ag-grid - no field found for column while doing setFilterModel');
            }
        });
        // at this point, processedFields contains data for which we don't have a filter working yet
        utils.iterateArray(processedFields, function(field) {
            var column = that.columnModel.getColumn(field);
            if (!column) {
                console.warn('Warning ag-grid - no column found for field ' + field);
                return;
            }
            var filterWrapper = that.getOrCreateFilterWrapper(column);
            that.setModelOnFilterWrapper(filterWrapper.filter, model[field]);
        });
    } else {
        utils.iterateObject(this.allFilters, function(key, filterWrapper) {
            that.setModelOnFilterWrapper(filterWrapper.filter, null);
        });
    }
};

FilterManager.prototype.setModelOnFilterWrapper = function(filter, newModel) {
    // because user can provide filters, we provide useful error checking and messages
    if (typeof filter.getApi !== 'function') {
        console.warn('Warning ag-grid - filter missing getApi method, which is needed for getFilterModel');
        return;
    }
    var filterApi = filter.getApi();
    if (typeof filterApi.setModel !== 'function') {
        console.warn('Warning ag-grid - filter API missing setModel method, which is needed for setFilterModel');
        return;
    }
    filterApi.setModel(newModel);
};

FilterManager.prototype.getFilterModel = function() {
    var result = {};
    utils.iterateObject(this.allFilters, function(key, filterWrapper) {
        // because user can provide filters, we provide useful error checking and messages
        if (typeof filterWrapper.filter.getApi !== 'function') {
            console.warn('Warning ag-grid - filter missing getApi method, which is needed for getFilterModel');
            return;
        }
        var filterApi = filterWrapper.filter.getApi();
        if (typeof filterApi.getModel !== 'function') {
            console.warn('Warning ag-grid - filter API missing getModel method, which is needed for getFilterModel');
            return;
        }
        var model = filterApi.getModel();
        if (model) {
            var field = filterWrapper.column.colDef.field;
            if (!field) {
                console.warn('Warning ag-grid - cannot get filter model when no field value present for column');
            } else {
                result[field] = model;
            }
        }
    });
    return result;
};

FilterManager.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

// returns true if at least one filter is active
FilterManager.prototype.isFilterPresent = function() {
    var atLeastOneActive = false;
    var that = this;

    var keys = Object.keys(this.allFilters);
    keys.forEach(function(key) {
        var filterWrapper = that.allFilters[key];
        if (!filterWrapper.filter.isFilterActive) { // because users can do custom filters, give nice error message
            console.error('Filter is missing method isFilterActive');
        }
        if (filterWrapper.filter.isFilterActive()) {
            atLeastOneActive = true;
        }
    });
    return atLeastOneActive;
};

// returns true if given col has a filter active
FilterManager.prototype.isFilterPresentForCol = function(colId) {
    var filterWrapper = this.allFilters[colId];
    if (!filterWrapper) {
        return false;
    }
    if (!filterWrapper.filter.isFilterActive) { // because users can do custom filters, give nice error message
        console.error('Filter is missing method isFilterActive');
    }
    var filterPresent = filterWrapper.filter.isFilterActive();
    return filterPresent;
};

FilterManager.prototype.doesFilterPass = function(node) {
    var data = node.data;
    var colKeys = Object.keys(this.allFilters);
    for (var i = 0, l = colKeys.length; i < l; i++) { // critical code, don't use functional programming

        var colId = colKeys[i];
        var filterWrapper = this.allFilters[colId];

        // if no filter, always pass
        if (filterWrapper === undefined) {
            continue;
        }

        if (!filterWrapper.filter.doesFilterPass) { // because users can do custom filters, give nice error message
            console.error('Filter is missing method doesFilterPass');
        }
        var params = {
            node: node,
            data: data
        };
        if (!filterWrapper.filter.doesFilterPass(params)) {
            return false;
        }
    }
    // all filters passed
    return true;
};

FilterManager.prototype.onNewRowsLoaded = function() {
    var that = this;
    Object.keys(this.allFilters).forEach(function(field) {
        var filter = that.allFilters[field].filter;
        if (filter.onNewRowsLoaded) {
            filter.onNewRowsLoaded();
        }
    });
};

FilterManager.prototype.positionPopup = function(eventSource, ePopup, ePopupRoot) {
    var sourceRect = eventSource.getBoundingClientRect();
    var parentRect = ePopupRoot.getBoundingClientRect();

    var x = sourceRect.left - parentRect.left;
    var y = sourceRect.top - parentRect.top + sourceRect.height;

    // if popup is overflowing to the right, move it left
    var widthOfPopup = 200; // this is set in the css
    var widthOfParent = parentRect.right - parentRect.left;
    var maxX = widthOfParent - widthOfPopup - 20; // 20 pixels grace
    if (x > maxX) { // move position left, back into view
        x = maxX;
    }
    if (x < 0) { // in case the popup has a negative value
        x = 0;
    }

    ePopup.style.left = x + "px";
    ePopup.style.top = y + "px";
};

FilterManager.prototype.createValueGetter = function(colDef) {
    var that = this;
    return function valueGetter(node) {
        var api = that.gridOptionsWrapper.getApi();
        var context = that.gridOptionsWrapper.getContext();
        return utils.getValue(that.expressionService, node.data, colDef, node, api, context);
    };
};

FilterManager.prototype.getFilterApi = function(column) {
    var filterWrapper = this.getOrCreateFilterWrapper(column);
    if (filterWrapper) {
        if (typeof filterWrapper.filter.getApi === 'function') {
            return filterWrapper.filter.getApi();
        }
    }
};

FilterManager.prototype.getOrCreateFilterWrapper = function(column) {
    var filterWrapper = this.allFilters[column.colId];

    if (!filterWrapper) {
        filterWrapper = this.createFilterWrapper(column);
        this.allFilters[column.colId] = filterWrapper;
    }

    return filterWrapper;
};

FilterManager.prototype.createFilterWrapper = function(column) {
    var colDef = column.colDef;

    var filterWrapper = {
        column: column
    };
    var filterChangedCallback = this.grid.onFilterChanged.bind(this.grid);
    var filterParams = colDef.filterParams;
    var params = {
        colDef: colDef,
        rowModel: this.rowModel,
        filterChangedCallback: filterChangedCallback,
        filterParams: filterParams,
        localeTextFunc: this.gridOptionsWrapper.getLocaleTextFunc(),
        valueGetter: this.createValueGetter(colDef)
    };
    if (typeof colDef.filter === 'function') {
        // if user provided a filter, just use it
        // first up, create child scope if needed
        if (this.gridOptionsWrapper.isAngularCompileFilters()) {
            var scope = this.$scope.$new();
            filterWrapper.scope = scope;
            params.$scope = scope;
        }
        // now create filter
        filterWrapper.filter = new colDef.filter(params);
    } else if (colDef.filter === 'text') {
        filterWrapper.filter = new StringFilter(params);
    } else if (colDef.filter === 'number') {
        filterWrapper.filter = new NumberFilter(params);
    } else {
        filterWrapper.filter = new SetFilter(params);
    }

    if (!filterWrapper.filter.getGui) { // because users can do custom filters, give nice error message
        throw 'Filter is missing method getGui';
    }

    var eFilterGui = document.createElement('div');
    eFilterGui.className = 'ag-filter';
    var guiFromFilter = filterWrapper.filter.getGui();
    if (utils.isNodeOrElement(guiFromFilter)) {
        //a dom node or element was returned, so add child
        eFilterGui.appendChild(guiFromFilter);
    } else {
        //otherwise assume it was html, so just insert
        var eTextSpan = document.createElement('span');
        eTextSpan.innerHTML = guiFromFilter;
        eFilterGui.appendChild(eTextSpan);
    }

    if (filterWrapper.scope) {
        filterWrapper.gui = this.$compile(eFilterGui)(filterWrapper.scope)[0];
    } else {
        filterWrapper.gui = eFilterGui;
    }

    return filterWrapper;
};

FilterManager.prototype.showFilter = function(column, eventSource) {

    var filterWrapper = this.getOrCreateFilterWrapper(column);

    var ePopupParent = this.grid.getPopupParent();
    this.positionPopup(eventSource, filterWrapper.gui, ePopupParent);

    utils.addAsModalPopup(ePopupParent, filterWrapper.gui);

    if (filterWrapper.filter.afterGuiAttached) {
        filterWrapper.filter.afterGuiAttached();
    }
};

module.exports = FilterManager;

},{"./../utils":39,"./numberFilter":10,"./setFilter":12,"./textFilter":15}],9:[function(require,module,exports){
module.exports = "<div><div><select class=ag-filter-select id=filterType><option value=1>[EQUALS]</option><option value=2>[LESS THAN]</option><option value=3>[GREATER THAN]</option></select></div><div><input class=ag-filter-filter id=filterText type=text placeholder=\"[FILTER...]\"></div></div>";

},{}],10:[function(require,module,exports){
var utils = require('./../utils');
var template = require('./numberFilter.html');

var EQUALS = 1;
var LESS_THAN = 2;
var GREATER_THAN = 3;

function NumberFilter(params) {
    this.filterParams = params.filterParams;
    this.filterChangedCallback = params.filterChangedCallback;
    this.localeTextFunc = params.localeTextFunc;
    this.valueGetter = params.valueGetter;
    this.createGui();
    this.filterNumber = null;
    this.filterType = EQUALS;
    this.createApi();
}

/* public */
NumberFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    if (!keepSelection) {
        this.api.setType(EQUALS);
        this.api.setFilter(null);
    }
};

/* public */
NumberFilter.prototype.afterGuiAttached = function() {
    this.eFilterTextField.focus();
};

/* public */
NumberFilter.prototype.doesFilterPass = function(node) {
    if (this.filterNumber === null) {
        return true;
    }
    var value = this.valueGetter(node);

    if (!value && value !== 0) {
        return false;
    }

    var valueAsNumber;
    if (typeof value === 'number') {
        valueAsNumber = value;
    } else {
        valueAsNumber = parseFloat(value);
    }

    switch (this.filterType) {
        case EQUALS:
            return valueAsNumber === this.filterNumber;
        case LESS_THAN:
            return valueAsNumber <= this.filterNumber;
        case GREATER_THAN:
            return valueAsNumber >= this.filterNumber;
        default:
            // should never happen
            console.warn('invalid filter type ' + this.filterType);
            return false;
    }
};

/* public */
NumberFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
NumberFilter.prototype.isFilterActive = function() {
    return this.filterNumber !== null;
};

NumberFilter.prototype.createTemplate = function() {
    return template
        .replace('[FILTER...]', this.localeTextFunc('filterOoo', 'Filter...'))
        .replace('[EQUALS]', this.localeTextFunc('equals', 'Equals'))
        .replace('[LESS THAN]', this.localeTextFunc('lessThan', 'Less than'))
        .replace('[GREATER THAN]', this.localeTextFunc('greaterThan', 'Greater than'));
};

NumberFilter.prototype.createGui = function() {
    this.eGui = utils.loadTemplate(this.createTemplate());
    this.eFilterTextField = this.eGui.querySelector("#filterText");
    this.eTypeSelect = this.eGui.querySelector("#filterType");

    utils.addChangeListener(this.eFilterTextField, this.onFilterChanged.bind(this));
    this.eTypeSelect.addEventListener("change", this.onTypeChanged.bind(this));
};

NumberFilter.prototype.onTypeChanged = function() {
    this.filterType = parseInt(this.eTypeSelect.value);
    this.filterChangedCallback();
};

NumberFilter.prototype.onFilterChanged = function() {
    var filterText = utils.makeNull(this.eFilterTextField.value);
    if (filterText && filterText.trim() === '') {
        filterText = null;
    }
    if (filterText) {
        this.filterNumber = parseFloat(filterText);
    } else {
        this.filterNumber = null;
    }
    this.filterChangedCallback();
};

NumberFilter.prototype.createApi = function() {
    var that = this;
    this.api = {
        EQUALS: EQUALS,
        LESS_THAN: LESS_THAN,
        GREATER_THAN: GREATER_THAN,
        setType: function(type) {
            that.filterType = type;
            that.eTypeSelect.value = type;
        },
        setFilter: function(filter) {
            filter = utils.makeNull(filter);

            if (filter!==null && !(typeof filter === 'number')) {
                filter = parseFloat(filter);
            }
            that.filterNumber = filter;
            that.eFilterTextField.value = filter;
        },
        getType: function() {
            return that.filterType;
        },
        getFilter: function() {
            return that.filterNumber;
        },
        getModel: function() {
            if (that.isFilterActive()) {
                return {
                    type: that.filterType,
                    filter: that.filterNumber
                };
            } else {
                return null;
            }
        },
        setModel: function(dataModel) {
            if (dataModel) {
                this.setType(dataModel.type);
                this.setFilter(dataModel.filter);
            } else {
                this.setFilter(null);
            }
        }
    };
};

NumberFilter.prototype.getApi = function() {
    return this.api;
};

module.exports = NumberFilter;

},{"./../utils":39,"./numberFilter.html":9}],11:[function(require,module,exports){
module.exports = "<div><div class=ag-filter-header-container><input class=ag-filter-filter type=text placeholder=\"[SEARCH...]\"></div><div class=ag-filter-header-container><label><input id=selectAll type=checkbox class=\"ag-filter-checkbox\"> ([SELECT ALL])</label></div><div class=ag-filter-list-viewport><div class=ag-filter-list-container><div id=itemForRepeat class=ag-filter-item><label><input type=checkbox class=ag-filter-checkbox filter-checkbox=\"true\"> <span class=ag-filter-value></span></label></div></div></div></div>";

},{}],12:[function(require,module,exports){
var utils = require('./../utils');
var SetFilterModel = require('./setFilterModel');
var template = require('./setFilter.html');

var DEFAULT_ROW_HEIGHT = 20;

function SetFilter(params) {
    this.filterParams = params.filterParams;
    this.rowHeight = (this.filterParams && this.filterParams.cellHeight) ? this.filterParams.cellHeight : DEFAULT_ROW_HEIGHT;
    this.model = new SetFilterModel(params.colDef, params.rowModel, params.valueGetter);
    this.filterChangedCallback = params.filterChangedCallback;
    this.valueGetter = params.valueGetter;
    this.rowsInBodyContainer = {};
    this.colDef = params.colDef;
    this.localeTextFunc = params.localeTextFunc;
    if (this.filterParams) {
        this.cellRenderer = this.filterParams.cellRenderer;
    }
    this.createGui();
    this.addScrollListener();
    this.createApi();
}

// we need to have the gui attached before we can draw the virtual rows, as the
// virtual row logic needs info about the gui state
/* public */
SetFilter.prototype.afterGuiAttached = function() {
    this.drawVirtualRows();
};

/* public */
SetFilter.prototype.isFilterActive = function() {
    return this.model.isFilterActive();
};

/* public */
SetFilter.prototype.doesFilterPass = function(node) {

    //if no filter, always pass
    if (this.model.isEverythingSelected()) {
        return true;
    }
    //if nothing selected in filter, always fail
    if (this.model.isNothingSelected()) {
        return false;
    }

    var value = this.valueGetter(node);
    value = utils.makeNull(value);

    var filterPassed = this.model.isValueSelected(value);
    return filterPassed;
};

/* public */
SetFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
SetFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    // default is reset
    this.model.refreshUniqueValues(keepSelection);
    this.setContainerHeight();
    this.refreshVirtualRows();
};

SetFilter.prototype.createTemplate = function() {
    return template
        .replace('[SELECT ALL]', this.localeTextFunc('selectAll', 'Select All'))
        .replace('[SEARCH...]', this.localeTextFunc('searchOoo', 'Search...'));
};

SetFilter.prototype.createGui = function() {
    var _this = this;

    this.eGui = utils.loadTemplate(this.createTemplate());

    this.eListContainer = this.eGui.querySelector(".ag-filter-list-container");
    this.eFilterValueTemplate = this.eGui.querySelector("#itemForRepeat");
    this.eSelectAll = this.eGui.querySelector("#selectAll");
    this.eListViewport = this.eGui.querySelector(".ag-filter-list-viewport");
    this.eMiniFilter = this.eGui.querySelector(".ag-filter-filter");
    this.eListContainer.style.height = (this.model.getUniqueValueCount() * this.rowHeight) + "px";

    this.setContainerHeight();
    this.eMiniFilter.value = this.model.getMiniFilter();
    utils.addChangeListener(this.eMiniFilter, function() {
        _this.onMiniFilterChanged();
    });
    utils.removeAllChildren(this.eListContainer);

    this.eSelectAll.onclick = this.onSelectAll.bind(this);

    if (this.model.isEverythingSelected()) {
        this.eSelectAll.indeterminate = false;
        this.eSelectAll.checked = true;
    } else if (this.model.isNothingSelected()) {
        this.eSelectAll.indeterminate = false;
        this.eSelectAll.checked = false;
    } else {
        this.eSelectAll.indeterminate = true;
    }
};

SetFilter.prototype.setContainerHeight = function() {
    this.eListContainer.style.height = (this.model.getDisplayedValueCount() * this.rowHeight) + "px";
};

SetFilter.prototype.drawVirtualRows = function() {
    var topPixel = this.eListViewport.scrollTop;
    var bottomPixel = topPixel + this.eListViewport.offsetHeight;

    var firstRow = Math.floor(topPixel / this.rowHeight);
    var lastRow = Math.floor(bottomPixel / this.rowHeight);

    this.ensureRowsRendered(firstRow, lastRow);
};

SetFilter.prototype.ensureRowsRendered = function(start, finish) {
    var _this = this;

    //at the end, this array will contain the items we need to remove
    var rowsToRemove = Object.keys(this.rowsInBodyContainer);

    //add in new rows
    for (var rowIndex = start; rowIndex <= finish; rowIndex++) {
        //see if item already there, and if yes, take it out of the 'to remove' array
        if (rowsToRemove.indexOf(rowIndex.toString()) >= 0) {
            rowsToRemove.splice(rowsToRemove.indexOf(rowIndex.toString()), 1);
            continue;
        }
        //check this row actually exists (in case overflow buffer window exceeds real data)
        if (this.model.getDisplayedValueCount() > rowIndex) {
            var value = this.model.getDisplayedValue(rowIndex);
            _this.insertRow(value, rowIndex);
        }
    }

    //at this point, everything in our 'rowsToRemove' . . .
    this.removeVirtualRows(rowsToRemove);
};

//takes array of row id's
SetFilter.prototype.removeVirtualRows = function(rowsToRemove) {
    var _this = this;
    rowsToRemove.forEach(function(indexToRemove) {
        var eRowToRemove = _this.rowsInBodyContainer[indexToRemove];
        _this.eListContainer.removeChild(eRowToRemove);
        delete _this.rowsInBodyContainer[indexToRemove];
    });
};

SetFilter.prototype.insertRow = function(value, rowIndex) {
    var _this = this;

    var eFilterValue = this.eFilterValueTemplate.cloneNode(true);

    var valueElement = eFilterValue.querySelector(".ag-filter-value");
    if (this.cellRenderer) {
        //renderer provided, so use it
        var resultFromRenderer = this.cellRenderer({
            value: value
        });

        if (utils.isNode(resultFromRenderer)) {
            //a dom node or element was returned, so add child
            valueElement.appendChild(resultFromRenderer);
        } else {
            //otherwise assume it was html, so just insert
            valueElement.innerHTML = resultFromRenderer;
        }

    } else {
        //otherwise display as a string
        var blanksText = '(' + this.localeTextFunc('blanks', 'Blanks') + ')';
        var displayNameOfValue = value === null ? blanksText : value;
        valueElement.innerHTML = displayNameOfValue;
    }
    var eCheckbox = eFilterValue.querySelector("input");
    eCheckbox.checked = this.model.isValueSelected(value);

    eCheckbox.onclick = function() {
        _this.onCheckboxClicked(eCheckbox, value);
    };

    eFilterValue.style.top = (this.rowHeight * rowIndex) + "px";

    this.eListContainer.appendChild(eFilterValue);
    this.rowsInBodyContainer[rowIndex] = eFilterValue;
};

SetFilter.prototype.onCheckboxClicked = function(eCheckbox, value) {
    var checked = eCheckbox.checked;
    if (checked) {
        this.model.selectValue(value);
        if (this.model.isEverythingSelected()) {
            this.eSelectAll.indeterminate = false;
            this.eSelectAll.checked = true;
        } else {
            this.eSelectAll.indeterminate = true;
        }
    } else {
        this.model.unselectValue(value);
        //if set is empty, nothing is selected
        if (this.model.isNothingSelected()) {
            this.eSelectAll.indeterminate = false;
            this.eSelectAll.checked = false;
        } else {
            this.eSelectAll.indeterminate = true;
        }
    }

    this.filterChangedCallback();
};

SetFilter.prototype.onMiniFilterChanged = function() {
    var miniFilterChanged = this.model.setMiniFilter(this.eMiniFilter.value);
    if (miniFilterChanged) {
        this.setContainerHeight();
        this.refreshVirtualRows();
    }
};

SetFilter.prototype.refreshVirtualRows = function() {
    this.clearVirtualRows();
    this.drawVirtualRows();
};

SetFilter.prototype.clearVirtualRows = function() {
    var rowsToRemove = Object.keys(this.rowsInBodyContainer);
    this.removeVirtualRows(rowsToRemove);
};

SetFilter.prototype.onSelectAll = function() {
    var checked = this.eSelectAll.checked;
    if (checked) {
        this.model.selectEverything();
    } else {
        this.model.selectNothing();
    }
    this.updateAllCheckboxes(checked);
    this.filterChangedCallback();
};

SetFilter.prototype.updateAllCheckboxes = function(checked) {
    var currentlyDisplayedCheckboxes = this.eListContainer.querySelectorAll("[filter-checkbox=true]");
    for (var i = 0, l = currentlyDisplayedCheckboxes.length; i < l; i++) {
        currentlyDisplayedCheckboxes[i].checked = checked;
    }
};

SetFilter.prototype.addScrollListener = function() {
    var _this = this;

    this.eListViewport.addEventListener("scroll", function() {
        _this.drawVirtualRows();
    });
};

SetFilter.prototype.getApi = function() {
    return this.api;
};

SetFilter.prototype.createApi = function() {
    var model = this.model;
    var that = this;
    this.api = {
        setMiniFilter: function(newMiniFilter) {
            model.setMiniFilter(newMiniFilter);
        },
        getMiniFilter: function() {
            return model.getMiniFilter();
        },
        selectEverything: function() {
            model.selectEverything();
        },
        isFilterActive: function() {
            return model.isFilterActive();
        },
        selectNothing: function() {
            model.selectNothing();
        },
        unselectValue: function(value) {
            model.unselectValue(value);
            that.refreshVirtualRows();
        },
        selectValue: function(value) {
            model.selectValue(value);
            that.refreshVirtualRows();
        },
        isValueSelected: function(value) {
            return model.isValueSelected(value);
        },
        isEverythingSelected: function() {
            return model.isEverythingSelected();
        },
        isNothingSelected: function() {
            return model.isNothingSelected();
        },
        getUniqueValueCount: function() {
            return model.getUniqueValueCount();
        },
        getUniqueValue: function(index) {
            return model.getUniqueValue(index);
        },
        getModel: function() {
            return model.getModel();
        },
        setModel: function(dataModel) {
            model.setModel(dataModel);
            that.refreshVirtualRows();
        }
    };
};

module.exports = SetFilter;

},{"./../utils":39,"./setFilter.html":11,"./setFilterModel":13}],13:[function(require,module,exports){
var utils = require('../utils');

function SetFilterModel(colDef, rowModel, valueGetter) {
    this.colDef = colDef;
    this.rowModel = rowModel;
    this.valueGetter = valueGetter;

    this.createUniqueValues();

    // by default, no filter, so we display everything
    this.displayedValues = this.uniqueValues;
    this.miniFilter = null;
    //we use a map rather than an array for the selected values as the lookup
    //for a map is much faster than the lookup for an array, especially when
    //the length of the array is thousands of records long
    this.selectedValuesMap = {};
    this.selectEverything();
}

SetFilterModel.prototype.refreshUniqueValues = function(keepSelection) {
    this.createUniqueValues();

    var oldModel = Object.keys(this.selectedValuesMap);

    this.selectedValuesMap = {};
    this.filterDisplayedValues();

    if (keepSelection) {
        this.setModel(oldModel);
    } else {
        this.selectEverything();
    }
};

SetFilterModel.prototype.createUniqueValues = function() {
    if (this.colDef.filterParams && this.colDef.filterParams.values) {
        this.uniqueValues = utils.toStrings(this.colDef.filterParams.values);
    } else {
        this.uniqueValues = utils.toStrings(this.iterateThroughNodesForValues());
    }

    if (this.colDef.comparator) {
        this.uniqueValues.sort(this.colDef.comparator);
    } else {
        this.uniqueValues.sort(utils.defaultComparator);
    }
};

SetFilterModel.prototype.iterateThroughNodesForValues = function() {
    var uniqueCheck = {};
    var result = [];

    var that = this;

    function recursivelyProcess(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.group && !node.footer) {
                // group node, so dig deeper
                recursivelyProcess(node.children);
            } else {
                var value = that.valueGetter(node);
                if (value === "" || value === undefined) {
                    value = null;
                }
                if (!uniqueCheck.hasOwnProperty(value)) {
                    result.push(value);
                    uniqueCheck[value] = 1;
                }
            }
        }
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();
    recursivelyProcess(topLevelNodes);

    return result;
};

//sets mini filter. returns true if it changed from last value, otherwise false
SetFilterModel.prototype.setMiniFilter = function(newMiniFilter) {
    newMiniFilter = utils.makeNull(newMiniFilter);
    if (this.miniFilter === newMiniFilter) {
        //do nothing if filter has not changed
        return false;
    }
    this.miniFilter = newMiniFilter;
    this.filterDisplayedValues();
    return true;
};

SetFilterModel.prototype.getMiniFilter = function() {
    return this.miniFilter;
};

SetFilterModel.prototype.filterDisplayedValues = function() {
    // if no filter, just use the unique values
    if (this.miniFilter === null) {
        this.displayedValues = this.uniqueValues;
        return;
    }

    // if filter present, we filter down the list
    this.displayedValues = [];
    var miniFilterUpperCase = this.miniFilter.toUpperCase();
    for (var i = 0, l = this.uniqueValues.length; i < l; i++) {
        var uniqueValue = this.uniqueValues[i];
        if (uniqueValue !== null && uniqueValue.toString().toUpperCase().indexOf(miniFilterUpperCase) >= 0) {
            this.displayedValues.push(uniqueValue);
        }
    }

};

SetFilterModel.prototype.getDisplayedValueCount = function() {
    return this.displayedValues.length;
};

SetFilterModel.prototype.getDisplayedValue = function(index) {
    return this.displayedValues[index];
};

SetFilterModel.prototype.selectEverything = function() {
    var count = this.uniqueValues.length;
    for (var i = 0; i < count; i++) {
        var value = this.uniqueValues[i];
        this.selectedValuesMap[value] = null;
    }
    this.selectedValuesCount = count;
};

SetFilterModel.prototype.isFilterActive = function() {
    return this.uniqueValues.length !== this.selectedValuesCount;
};

SetFilterModel.prototype.selectNothing = function() {
    this.selectedValuesMap = {};
    this.selectedValuesCount = 0;
};

SetFilterModel.prototype.getUniqueValueCount = function() {
    return this.uniqueValues.length;
};

SetFilterModel.prototype.getUniqueValue = function(index) {
    return this.uniqueValues[index];
};

SetFilterModel.prototype.unselectValue = function(value) {
    if (this.selectedValuesMap[value] !== undefined) {
        delete this.selectedValuesMap[value];
        this.selectedValuesCount--;
    }
};

SetFilterModel.prototype.selectValue = function(value) {
    if (this.selectedValuesMap[value] === undefined) {
        this.selectedValuesMap[value] = null;
        this.selectedValuesCount++;
    }
};

SetFilterModel.prototype.isValueSelected = function(value) {
    return this.selectedValuesMap[value] !== undefined;
};

SetFilterModel.prototype.isEverythingSelected = function() {
    return this.uniqueValues.length === this.selectedValuesCount;
};

SetFilterModel.prototype.isNothingSelected = function() {
    return this.uniqueValues.length === 0;
};

SetFilterModel.prototype.getModel = function() {
    if (!this.isFilterActive()) {
        return null;
    }
    var selectedValues = [];
    utils.iterateObject(this.selectedValuesMap, function(key) {
        selectedValues.push(key);
    });
    return selectedValues;
};

SetFilterModel.prototype.setModel = function(model) {
    if (model) {
        this.selectNothing();
        for (var i = 0; i<model.length; i++) {
            var newValue = model[i];
            if (this.uniqueValues.indexOf(newValue)>=0) {
                this.selectValue(model[i]);
            } else {
                console.warn('Value ' + newValue + ' is not a valid value for filter');
            }
        }
    } else {
        this.selectEverything();
    }
};

module.exports = SetFilterModel;

},{"../utils":39}],14:[function(require,module,exports){
module.exports = "<div><div><select class=ag-filter-select id=filterType><option value=1>[CONTAINS]</option><option value=2>[EQUALS]</option><option value=3>[STARTS WITH]</option><option value=4>[ENDS WITH]</option></select></div><div><input class=ag-filter-filter id=filterText type=text placeholder=\"[FILTER...]\"></div></div>";

},{}],15:[function(require,module,exports){
var utils = require('../utils');
var template = require('./textFilter.html');

var CONTAINS = 1;
var EQUALS = 2;
var STARTS_WITH = 3;
var ENDS_WITH = 4;

function TextFilter(params) {
    this.filterParams = params.filterParams;
    this.filterChangedCallback = params.filterChangedCallback;
    this.localeTextFunc = params.localeTextFunc;
    this.valueGetter = params.valueGetter;
    this.createGui();
    this.filterText = null;
    this.filterType = CONTAINS;
    this.createApi();
}

/* public */
TextFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    if (!keepSelection) {
        this.api.setType(CONTAINS);
        this.api.setFilter(null);
    }
};

/* public */
TextFilter.prototype.afterGuiAttached = function() {
    this.eFilterTextField.focus();
};

/* public */
TextFilter.prototype.doesFilterPass = function(node) {
    if (!this.filterText) {
        return true;
    }
    var value = this.valueGetter(node);
    if (!value) {
        return false;
    }
    var valueLowerCase = value.toString().toLowerCase();
    switch (this.filterType) {
        case CONTAINS:
            return valueLowerCase.indexOf(this.filterText) >= 0;
        case EQUALS:
            return valueLowerCase === this.filterText;
        case STARTS_WITH:
            return valueLowerCase.indexOf(this.filterText) === 0;
        case ENDS_WITH:
            var index = valueLowerCase.indexOf(this.filterText);
            return index >= 0 && index === (valueLowerCase.length - this.filterText.length);
        default:
            // should never happen
            console.warn('invalid filter type ' + this.filterType);
            return false;
    }
};

/* public */
TextFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
TextFilter.prototype.isFilterActive = function() {
    return this.filterText !== null;
};

TextFilter.prototype.createTemplate = function() {
    return template
        .replace('[FILTER...]', this.localeTextFunc('filterOoo', 'Filter...'))
        .replace('[EQUALS]', this.localeTextFunc('equals', 'Equals'))
        .replace('[CONTAINS]', this.localeTextFunc('contains', 'Contains'))
        .replace('[STARTS WITH]', this.localeTextFunc('startsWith', 'Starts with'))
        .replace('[ENDS WITH]', this.localeTextFunc('endsWith', 'Ends with'))
;
};

'<option value="1">Contains</option>',
    '<option value="2">Equals</option>',
    '<option value="3">Starts with</option>',
    '<option value="4">Ends with</option>',


TextFilter.prototype.createGui = function() {
    this.eGui = utils.loadTemplate(this.createTemplate());
    this.eFilterTextField = this.eGui.querySelector("#filterText");
    this.eTypeSelect = this.eGui.querySelector("#filterType");

    utils.addChangeListener(this.eFilterTextField, this.onFilterChanged.bind(this));
    this.eTypeSelect.addEventListener("change", this.onTypeChanged.bind(this));
};

TextFilter.prototype.onTypeChanged = function() {
    this.filterType = parseInt(this.eTypeSelect.value);
    this.filterChangedCallback();
};

TextFilter.prototype.onFilterChanged = function() {
    var filterText = utils.makeNull(this.eFilterTextField.value);
    if (filterText && filterText.trim() === '') {
        filterText = null;
    }
    if (filterText) {
        this.filterText = filterText.toLowerCase();
    } else {
        this.filterText = null;
    }
    this.filterChangedCallback();
};

TextFilter.prototype.createApi = function() {
    var that = this;
    this.api = {
        EQUALS: EQUALS,
        CONTAINS: CONTAINS,
        STARTS_WITH: STARTS_WITH,
        ENDS_WITH: ENDS_WITH,
        setType: function(type) {
            that.filterType = type;
            that.eTypeSelect.value = type;
        },
        setFilter: function(filter) {
            filter = utils.makeNull(filter);

            if (filter) {
                that.filterText = filter.toLowerCase();
                that.eFilterTextField.value = filter;
            } else {
                that.filterText = null;
                that.eFilterTextField.value = null;
            }
        },
        getType: function() {
            return that.filterType;
        },
        getFilter: function() {
            return that.filterText;
        },
        getModel: function() {
            if (that.isFilterActive()) {
                return {
                    type: that.filterType,
                    filter: that.filterText
                };
            } else {
                return null;
            }
        },
        setModel: function(dataModel) {
            if (dataModel) {
                this.setType(dataModel.type);
                this.setFilter(dataModel.filter);
            } else {
                this.setFilter(null);
            }
        }
    };
};

TextFilter.prototype.getApi = function() {
    return this.api;
};

module.exports = TextFilter;

},{"../utils":39,"./textFilter.html":14}],16:[function(require,module,exports){
var utils = require('./utils');
var constants = require('./constants');
var GridOptionsWrapper = require('./gridOptionsWrapper');
var SelectionController = require('./selectionController');
var FilterManager = require('./filter/filterManager');
var SelectionRendererFactory = require('./selectionRendererFactory');
var ColumnController = require('./columnController');
var RowRenderer = require('./rowRenderer');
var HeaderRenderer = require('./headerRenderer');
var InMemoryRowController = require('./rowControllers/inMemoryRowController');
var VirtualPageRowController = require('./rowControllers/virtualPageRowController');
var PaginationController = require('./rowControllers/paginationController');
var ExpressionService = require('./expressionService');
var TemplateService = require('./templateService');
var ToolPanel = require('./toolPanel/toolPanel');
var BorderLayout = require('./layout/borderLayout');
var GridPanel = require('./gridPanel/gridPanel');

function Grid(eGridDiv, gridOptions, $scope, $compile, quickFilterOnScope) {

    this.gridOptions = gridOptions;
    this.gridOptionsWrapper = new GridOptionsWrapper(this.gridOptions);

    this.setupComponents($scope, $compile, eGridDiv);

    var that = this;
    this.quickFilter = null;

    // if using angular, watch for quickFilter changes
    if ($scope) {
        $scope.$watch(quickFilterOnScope, function(newFilter) {
            that.onQuickFilterChanged(newFilter);
        });
    }

    this.virtualRowCallbacks = {};

    var forPrint = this.gridOptionsWrapper.isDontUseScrolls();
    this.addApi();

    this.scrollWidth = utils.getScrollbarWidth();

    // done when cols change
    this.setupColumns();

    this.inMemoryRowController.setAllRows(this.gridOptionsWrapper.getAllRows());

    if (!forPrint) {
        window.addEventListener('resize', this.doLayout.bind(this));
    }

    this.updateModelAndRefresh(constants.STEP_EVERYTHING);

    // if no data provided initially, and not doing infinite scrolling, show the loading panel
    var showLoading = !this.gridOptionsWrapper.getAllRows() && !this.gridOptionsWrapper.isVirtualPaging();
    this.showLoadingPanel(showLoading);

    // if datasource provided, use it
    if (this.gridOptionsWrapper.getDatasource()) {
        this.setDatasource();
    }

    this.doLayout();

    // if ready function provided, use it
    if (typeof this.gridOptionsWrapper.getReady() == 'function') {
        this.gridOptionsWrapper.getReady()(gridOptions.api);
    }
}

Grid.prototype.setupComponents = function($scope, $compile, eUserProvidedDiv) {

    // make local references, to make the below more human readable
    var gridOptionsWrapper = this.gridOptionsWrapper;
    var gridOptions = this.gridOptions;
    var forPrint = gridOptionsWrapper.isDontUseScrolls();

    // create all the beans
    var selectionController = new SelectionController();
    var filterManager = new FilterManager();
    var selectionRendererFactory = new SelectionRendererFactory();
    var columnController = new ColumnController();
    var rowRenderer = new RowRenderer();
    var headerRenderer = new HeaderRenderer();
    var inMemoryRowController = new InMemoryRowController();
    var virtualPageRowController = new VirtualPageRowController();
    var expressionService = new ExpressionService();
    var templateService = new TemplateService();
    var gridPanel = new GridPanel(gridOptionsWrapper);

    var columnModel = columnController.getModel();

    // initialise all the beans
    templateService.init($scope);
    selectionController.init(this, gridPanel, gridOptionsWrapper, $scope, rowRenderer);
    filterManager.init(this, gridOptionsWrapper, $compile, $scope, expressionService, columnModel);
    selectionRendererFactory.init(this, selectionController);
    columnController.init(this, selectionRendererFactory, gridOptionsWrapper, expressionService);
    rowRenderer.init(gridOptions, columnModel, gridOptionsWrapper, gridPanel, this,
        selectionRendererFactory, $compile, $scope, selectionController, expressionService, templateService);
    headerRenderer.init(gridOptionsWrapper, columnController, columnModel, gridPanel, this, filterManager,
        $scope, $compile, expressionService);
    inMemoryRowController.init(gridOptionsWrapper, columnModel, this, filterManager, $scope, expressionService);
    virtualPageRowController.init(rowRenderer, gridOptionsWrapper, this);
    gridPanel.init(columnModel, rowRenderer);

    var toolPanelLayout = null;
    var eToolPanel = null;
    if (!forPrint) {
        eToolPanel = new ToolPanel();
        toolPanelLayout = eToolPanel.layout;
        eToolPanel.init(columnController, inMemoryRowController, gridOptionsWrapper);
    }

    // this is a child bean, get a reference and pass it on
    // CAN WE DELETE THIS? it's done in the setDatasource section
    var rowModel = inMemoryRowController.getModel();
    selectionController.setRowModel(rowModel);
    filterManager.setRowModel(rowModel);
    rowRenderer.setRowModel(rowModel);
    gridPanel.setRowModel(rowModel);

    // and the last bean, done in it's own section, as it's optional
    var paginationController = null;
    var paginationGui = null;
    if (!forPrint) {
        paginationController = new PaginationController();
        paginationController.init(this, gridOptionsWrapper);
        paginationGui = paginationController.getGui();
    }

    this.rowModel = rowModel;
    this.selectionController = selectionController;
    this.columnController = columnController;
    this.columnModel = columnModel;
    this.inMemoryRowController = inMemoryRowController;
    this.virtualPageRowController = virtualPageRowController;
    this.rowRenderer = rowRenderer;
    this.headerRenderer = headerRenderer;
    this.paginationController = paginationController;
    this.filterManager = filterManager;
    this.eToolPanel = eToolPanel;
    this.gridPanel = gridPanel;

    this.eRootPanel = new BorderLayout({
        center: gridPanel.layout,
        east: toolPanelLayout,
        south: paginationGui,
        dontFill: forPrint,
        name: 'eRootPanel'
    });

    // default is we don't show paging panel, this is set to true when datasource is set
    this.eRootPanel.setSouthVisible(false);

    // see what the grid options are for default of toolbar
    this.showToolPanel(gridOptionsWrapper.isShowToolPanel());

    eUserProvidedDiv.appendChild(this.eRootPanel.getGui());
};

Grid.prototype.showToolPanel = function(show) {
    if (!this.eToolPanel) {
        this.toolPanelShowing = false;
        return;
    }

    this.toolPanelShowing = show;
    this.eRootPanel.setEastVisible(show);
};

Grid.prototype.isToolPanelShowing = function() {
    return this.toolPanelShowing;
};

Grid.prototype.setDatasource = function(datasource) {
    // if datasource provided, then set it
    if (datasource) {
        this.gridOptions.datasource = datasource;
    }
    // get the set datasource (if null was passed to this method,
    // then need to get the actual datasource from options
    var datasourceToUse = this.gridOptionsWrapper.getDatasource();
    this.doingVirtualPaging = this.gridOptionsWrapper.isVirtualPaging() && datasourceToUse;
    this.doingPagination = datasourceToUse && !this.doingVirtualPaging;
    var showPagingPanel;

    if (this.doingVirtualPaging) {
        this.paginationController.setDatasource(null);
        this.virtualPageRowController.setDatasource(datasourceToUse);
        this.rowModel = this.virtualPageRowController.getModel();
        showPagingPanel = false;
    } else if (this.doingPagination) {
        this.paginationController.setDatasource(datasourceToUse);
        this.virtualPageRowController.setDatasource(null);
        this.rowModel = this.inMemoryRowController.getModel();
        showPagingPanel = true;
    } else {
        this.paginationController.setDatasource(null);
        this.virtualPageRowController.setDatasource(null);
        this.rowModel = this.inMemoryRowController.getModel();
        showPagingPanel = false;
    }

    this.selectionController.setRowModel(this.rowModel);
    this.filterManager.setRowModel(this.rowModel);
    this.rowRenderer.setRowModel(this.rowModel);

    this.eRootPanel.setSouthVisible(showPagingPanel);

    // because we just set the rowModel, need to update the gui
    this.rowRenderer.refreshView();

    this.doLayout();
};

// gets called after columns are shown / hidden from groups expanding
Grid.prototype.refreshHeaderAndBody = function() {
    this.headerRenderer.refreshHeader();
    this.headerRenderer.updateFilterIcons();
    this.headerRenderer.updateSortIcons();
    this.gridPanel.setBodyContainerWidth();
    this.gridPanel.setPinnedColContainerWidth();
    this.rowRenderer.refreshView();
};

Grid.prototype.setFinished = function() {
    window.removeEventListener('resize', this.doLayout);
};

Grid.prototype.getPopupParent = function() {
    return this.eRootPanel.getGui();
};

Grid.prototype.getQuickFilter = function() {
    return this.quickFilter;
};

Grid.prototype.onQuickFilterChanged = function(newFilter) {
    if (newFilter === undefined || newFilter === "") {
        newFilter = null;
    }
    if (this.quickFilter !== newFilter) {
        if (this.gridOptionsWrapper.isVirtualPaging()) {
            console.warn('ag-grid: cannot do quick filtering when doing virtual paging');
            return;
        }

        //want 'null' to mean to filter, so remove undefined and empty string
        if (newFilter === undefined || newFilter === "") {
            newFilter = null;
        }
        if (newFilter !== null) {
            newFilter = newFilter.toUpperCase();
        }
        this.quickFilter = newFilter;
        this.onFilterChanged();
    }
};

Grid.prototype.onFilterChanged = function() {
    this.headerRenderer.updateFilterIcons();
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        // if doing server side filtering, changing the sort has the impact
        // of resetting the datasource
        this.setDatasource();
    } else {
        // if doing in memory filtering, we just update the in memory data
        this.updateModelAndRefresh(constants.STEP_FILTER);
    }
};

Grid.prototype.onRowClicked = function(event, rowIndex, node) {

    if (this.gridOptions.rowClicked) {
        var params = {
            node: node,
            data: node.data,
            event: event,
            rowIndex: rowIndex
        };
        this.gridOptions.rowClicked(params);
    }

    // we do not allow selecting groups by clicking (as the click here expands the group)
    // so return if it's a group row
    if (node.group) {
        return;
    }

    // making local variables to make the below more readable
    var gridOptionsWrapper = this.gridOptionsWrapper;
    var selectionController = this.selectionController;

    // if no selection method enabled, do nothing
    if (!gridOptionsWrapper.isRowSelection()) {
        return;
    }

    // if click selection suppressed, do nothing
    if (gridOptionsWrapper.isSuppressRowClickSelection()) {
        return;
    }

    // ctrlKey for windows, metaKey for Apple
    var ctrlKeyPressed = event.ctrlKey || event.metaKey;

    var doDeselect = ctrlKeyPressed
        && selectionController.isNodeSelected(node)
        && gridOptionsWrapper.isRowDeselection() ;

    if (doDeselect) {
        selectionController.deselectNode(node);
    } else {
        var tryMulti = ctrlKeyPressed;
        selectionController.selectNode(node, tryMulti);
    }
};

Grid.prototype.showLoadingPanel = function(show) {
    this.gridPanel.showLoading(show);
};

Grid.prototype.setupColumns = function() {
    this.gridPanel.setHeaderHeight();
    this.columnController.setColumns(this.gridOptionsWrapper.getColumnDefs());
    this.gridPanel.showPinnedColContainersIfNeeded();
    this.headerRenderer.refreshHeader();
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        this.gridPanel.setPinnedColContainerWidth();
        this.gridPanel.setBodyContainerWidth();
    }
    this.headerRenderer.updateFilterIcons();
};

// rowsToRefresh is at what index to start refreshing the rows. the assumption is
// if we are expanding or collapsing a group, then only he rows below the group
// need to be refresh. this allows the context (eg focus) of the other cells to
// remain.
Grid.prototype.updateModelAndRefresh = function(step, refreshFromIndex) {
    this.inMemoryRowController.updateModel(step);
    this.rowRenderer.refreshView(refreshFromIndex);
};

Grid.prototype.setRows = function(rows, firstId) {
    if (rows) {
        this.gridOptions.rowData = rows;
    }
    this.inMemoryRowController.setAllRows(this.gridOptionsWrapper.getAllRows(), firstId);
    this.selectionController.deselectAll();
    this.filterManager.onNewRowsLoaded();
    this.updateModelAndRefresh(constants.STEP_EVERYTHING);
    this.headerRenderer.updateFilterIcons();
    this.showLoadingPanel(false);
};

Grid.prototype.ensureNodeVisible = function(comparator) {
    if (this.doingVirtualPaging) {
        throw 'Cannot use ensureNodeVisible when doing virtual paging, as we cannot check rows that are not in memory';
    }
    // look for the node index we want to display
    var rowCount = this.rowModel.getVirtualRowCount();
    var comparatorIsAFunction = typeof comparator === 'function';
    var indexToSelect = -1;
    // go through all the nodes, find the one we want to show
    for (var i = 0; i < rowCount; i++) {
        var node = this.rowModel.getVirtualRow(i);
        if (comparatorIsAFunction) {
            if (comparator(node)) {
                indexToSelect = i;
                break;
            }
        } else {
            // check object equality against node and data
            if (comparator === node || comparator === node.data) {
                indexToSelect = i;
                break;
            }
        }
    }
    if (indexToSelect >= 0) {
        this.gridPanel.ensureIndexVisible(indexToSelect);
    }
};

Grid.prototype.getFilterModel = function() {
    return this.filterManager.getFilterModel();
};

Grid.prototype.addApi = function() {
    var that = this;
    var api = {
        setDatasource: function(datasource) {
            that.setDatasource(datasource);
        },
        onNewDatasource: function() {
            that.setDatasource();
        },
        setRows: function(rows) {
            that.setRows(rows);
        },
        onNewRows: function() {
            that.setRows();
        },
        onNewCols: function() {
            that.onNewCols();
        },
        unselectAll: function() {
            console.error("unselectAll deprecated, call deselectAll instead");
            this.deselectAll();
        },
        refreshView: function() {
            that.rowRenderer.refreshView();
        },
        softRefreshView: function() {
            that.rowRenderer.softRefreshView();
        },
        refreshGroupRows: function() {
            that.rowRenderer.refreshGroupRows();
        },
        refreshHeader: function() {
            // need to review this - the refreshHeader should also refresh all icons in the header
            that.headerRenderer.refreshHeader();
            that.headerRenderer.updateFilterIcons();
        },
        getModel: function() {
            return that.rowModel;
        },
        onGroupExpandedOrCollapsed: function(refreshFromIndex) {
            that.updateModelAndRefresh(constants.STEP_MAP, refreshFromIndex);
        },
        expandAll: function() {
            that.inMemoryRowController.expandOrCollapseAll(true, null);
            that.updateModelAndRefresh(constants.STEP_MAP);
        },
        collapseAll: function() {
            that.inMemoryRowController.expandOrCollapseAll(false, null);
            that.updateModelAndRefresh(constants.STEP_MAP);
        },
        addVirtualRowListener: function(rowIndex, callback) {
            that.addVirtualRowListener(rowIndex, callback);
        },
        rowDataChanged: function(rows) {
            that.rowRenderer.rowDataChanged(rows);
        },
        setQuickFilter: function(newFilter) {
            that.onQuickFilterChanged(newFilter)
        },
        selectIndex: function(index, tryMulti, suppressEvents) {
            that.selectionController.selectIndex(index, tryMulti, suppressEvents);
        },
        deselectIndex: function(index) {
            that.selectionController.deselectIndex(index);
        },
        selectNode: function(node, tryMulti, suppressEvents) {
            that.selectionController.selectNode(node, tryMulti, suppressEvents);
        },
        deselectNode: function(node) {
            that.selectionController.deselectNode(node);
        },
        selectAll: function() {
            that.selectionController.selectAll();
            that.rowRenderer.refreshView();
        },
        deselectAll: function() {
            that.selectionController.deselectAll();
            that.rowRenderer.refreshView();
        },
        recomputeAggregates: function() {
            that.inMemoryRowController.doAggregate();
            that.rowRenderer.refreshGroupRows();
        },
        sizeColumnsToFit: function() {
            if (that.gridOptionsWrapper.isDontUseScrolls()) {
                console.warn('ag-grid: sizeColumnsToFit does not work when dontUseScrolls=true');
                return;
            }
            var availableWidth = that.gridPanel.getWidthForSizeColsToFit();
            that.columnController.sizeColumnsToFit(availableWidth);
        },
        showLoading: function(show) {
            that.showLoadingPanel(show);
        },
        isNodeSelected: function(node) {
            return that.selectionController.isNodeSelected(node);
        },
        getSelectedNodes: function() {
            return that.selectionController.getSelectedNodes();
        },
        getBestCostNodeSelection: function() {
            return that.selectionController.getBestCostNodeSelection();
        },
        ensureColIndexVisible: function(index) {
            that.gridPanel.ensureColIndexVisible(index);
        },
        ensureIndexVisible: function(index) {
            that.gridPanel.ensureIndexVisible(index);
        },
        ensureNodeVisible: function(comparator) {
            that.ensureNodeVisible(comparator);
        },
        forEachInMemory: function(callback) {
            that.rowModel.forEachInMemory(callback);
        },
        getFilterApiForColDef: function(colDef) {
            console.warn('ag-grid API method getFilterApiForColDef deprecated, use getFilterApi instead');
            return this.getFilterApi(colDef);
        },
        getFilterApi: function(key) {
            var column = that.columnModel.getColumn(key);
            return that.filterManager.getFilterApi(column);
        },
        getColumnDef: function(key) {
            var column = that.columnModel.getColumn(key);
            if (column) {
                return column.colDef;
            } else {
                return null;
            }
        },
        onFilterChanged: function() {
            that.onFilterChanged();
        },
        setSortModel: function(sortModel) {
            that.setSortModel(sortModel);
        },
        getSortModel: function() {
            return that.getSortModel();
        },
        setFilterModel: function(model) {
            that.filterManager.setFilterModel(model);
        },
        getFilterModel: function() {
            return that.getFilterModel();
        },
        getFocusedCell: function() {
            return that.rowRenderer.getFocusedCell();
        },
        setFocusedCell: function(rowIndex, colIndex) {
            that.setFocusedCell(rowIndex, colIndex);
        },
        showToolPanel: function(show) {
            that.showToolPanel(show);
        },
        isToolPanelShowing: function() {
            return that.isToolPanelShowing();
        },
        hideColumn: function(colId, hide) {
            that.columnController.hideColumns([colId], hide);
        },
        hideColumns: function(colIds, hide) {
            that.columnController.hideColumns(colIds, hide);
        }
    };
    this.gridOptions.api = api;
};

Grid.prototype.setFocusedCell = function(rowIndex, colIndex) {
    this.gridPanel.ensureIndexVisible(rowIndex);
    this.gridPanel.ensureColIndexVisible(colIndex);
    var that = this;
    setTimeout( function() {
        that.rowRenderer.setFocusedCell(rowIndex, colIndex);
    }, 10);
};

Grid.prototype.getSortModel = function() {
    var allColumns = this.columnModel.getAllColumns();
    var columnsWithSorting = [];
    var i;
    for (i = 0; i<allColumns.length; i++) {
        if (allColumns[i].sort) {
            columnsWithSorting.push(allColumns[i]);
        }
    }
    columnsWithSorting.sort( function(a,b) {
        return a.sortedAt - b.sortedAt;
    });

    var result = [];
    for (i = 0; i<columnsWithSorting.length; i++) {
        var resultEntry = {
            field: columnsWithSorting[i].colDef.field,
            sort: columnsWithSorting[i].sort
        };
        result.push(resultEntry);
    }

    return result;
};

Grid.prototype.setSortModel = function(sortModel) {
    if (!this.gridOptionsWrapper.isEnableSorting()) {
        console.warn('ag-grid: You are setting the sort model on a grid that does not have sorting enabled');
        return;
    }
    // first up, clear any previous sort
    var sortModelProvided = sortModel!==null && sortModel!==undefined && sortModel.length>0;
    var allColumns = this.columnModel.getAllColumns();
    for (var i = 0; i<allColumns.length; i++) {
        var column = allColumns[i];

        var sortForCol = null;
        var sortedAt = -1;
        if (sortModelProvided && !column.colDef.suppressSorting) {
            for (var j = 0; j<sortModel.length; j++) {
                var sortModelEntry = sortModel[j];
                if (typeof sortModelEntry.field === 'string'
                    && typeof column.colDef.field === 'string'
                    && sortModelEntry.field === column.colDef.field) {
                    sortForCol = sortModelEntry.sort;
                    sortedAt = j;
                }
            }
        }

        if (sortForCol) {
            column.sort = sortForCol;
            column.sortedAt = sortedAt;
        } else {
            column.sort = null;
            column.sortedAt = null;
        }
    }

    this.onSortingChanged();
};

Grid.prototype.onSortingChanged = function() {
    this.headerRenderer.updateSortIcons();
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        // if doing server side sorting, changing the sort has the impact
        // of resetting the datasource
        this.setDatasource();
    } else {
        // if doing in memory sorting, we just update the in memory data
        this.updateModelAndRefresh(constants.STEP_SORT);
    }
};

Grid.prototype.addVirtualRowListener = function(rowIndex, callback) {
    if (!this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex] = [];
    }
    this.virtualRowCallbacks[rowIndex].push(callback);
};

Grid.prototype.onVirtualRowSelected = function(rowIndex, selected) {
    // inform the callbacks of the event
    if (this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex].forEach(function(callback) {
            if (typeof callback.rowRemoved === 'function') {
                callback.rowSelected(selected);
            }
        });
    }
};

Grid.prototype.onVirtualRowRemoved = function(rowIndex) {
    // inform the callbacks of the event
    if (this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex].forEach(function(callback) {
            if (typeof callback.rowRemoved === 'function') {
                callback.rowRemoved();
            }
        });
    }
    // remove the callbacks
    delete this.virtualRowCallbacks[rowIndex];
};

Grid.prototype.onNewCols = function() {
    this.setupColumns();
    this.updateModelAndRefresh(constants.STEP_EVERYTHING);
};

Grid.prototype.updateBodyContainerWidthAfterColResize = function() {
    this.rowRenderer.setMainRowWidths();
    this.gridPanel.setBodyContainerWidth();
};

Grid.prototype.updatePinnedColContainerWidthAfterColResize = function() {
    this.gridPanel.setPinnedColContainerWidth();
};

Grid.prototype.doLayout = function() {
    setTimeout(this.doLayoutForReal.bind(this), 0);
    setTimeout(this.doLayoutForReal.bind(this), 10);
    setTimeout(this.doLayoutForReal.bind(this), 20);
    //setTimeout(this.doLayoutForReal.bind(this), 500);
    this.doLayoutForReal();
};

Grid.prototype.doLayoutForReal = function() {
    // need to do layout first, as drawVirtualRows and setPinnedColHeight
    // need to know the result of the resizing of the panels.
    this.eRootPanel.doLayout();
    // both of the two below should be done in gridPanel, the gridPanel should register 'resize' to the panel
    this.rowRenderer.drawVirtualRows();
    this.gridPanel.setPinnedColHeight();
};

module.exports = Grid;

},{"./columnController":3,"./constants":4,"./expressionService":7,"./filter/filterManager":8,"./gridOptionsWrapper":17,"./gridPanel/gridPanel":20,"./headerRenderer":23,"./layout/borderLayout":25,"./rowControllers/inMemoryRowController":27,"./rowControllers/paginationController":28,"./rowControllers/virtualPageRowController":30,"./rowRenderer":31,"./selectionController":32,"./selectionRendererFactory":33,"./templateService":35,"./toolPanel/toolPanel":38,"./utils":39}],17:[function(require,module,exports){
var DEFAULT_ROW_HEIGHT = 30;

var constants = require('./constants');
function GridOptionsWrapper(gridOptions) {
    this.gridOptions = gridOptions;
    this.setupDefaults();
}

function isTrue(value) {
    return value === true || value === 'true';
}

GridOptionsWrapper.prototype.isRowSelection = function() { return this.gridOptions.rowSelection === "single" || this.gridOptions.rowSelection === "multiple"; };
GridOptionsWrapper.prototype.isRowDeselection = function() { return isTrue(this.gridOptions.rowDeselection); };
GridOptionsWrapper.prototype.isRowSelectionMulti = function() { return this.gridOptions.rowSelection === 'multiple'; };
GridOptionsWrapper.prototype.getContext = function() { return this.gridOptions.context; };
GridOptionsWrapper.prototype.isVirtualPaging = function() { return isTrue(this.gridOptions.virtualPaging); };
GridOptionsWrapper.prototype.isShowToolPanel = function() { return isTrue(this.gridOptions.showToolPanel); };
GridOptionsWrapper.prototype.isRowsAlreadyGrouped = function() { return isTrue(this.gridOptions.rowsAlreadyGrouped); };
GridOptionsWrapper.prototype.isRowsAlreadyExpanded = function() { return isTrue(this.gridOptions.rowsAlreadyExpanded); };
GridOptionsWrapper.prototype.isGroupSelectsChildren = function() { return isTrue(this.gridOptions.groupSelectsChildren); };
GridOptionsWrapper.prototype.isGroupIncludeFooter = function() { return isTrue(this.gridOptions.groupIncludeFooter); };
GridOptionsWrapper.prototype.isSuppressRowClickSelection = function() { return isTrue(this.gridOptions.suppressRowClickSelection); };
GridOptionsWrapper.prototype.isSuppressCellSelection = function() { return isTrue(this.gridOptions.suppressCellSelection); };
GridOptionsWrapper.prototype.isSuppressUnSort = function() { return isTrue(this.gridOptions.suppressUnSort); };
GridOptionsWrapper.prototype.isSuppressMultiSort = function() { return isTrue(this.gridOptions.suppressMultiSort); };
GridOptionsWrapper.prototype.isGroupSuppressAutoColumn = function() { return isTrue(this.gridOptions.groupSuppressAutoColumn); };
GridOptionsWrapper.prototype.isGroupHeaders = function() { return isTrue(this.gridOptions.groupHeaders); };
GridOptionsWrapper.prototype.isDontUseScrolls = function() { return isTrue(this.gridOptions.dontUseScrolls); };
GridOptionsWrapper.prototype.isSuppressDescSort = function() { return isTrue(this.gridOptions.suppressDescSort); };
GridOptionsWrapper.prototype.getRowStyle = function() { return this.gridOptions.rowStyle; };
GridOptionsWrapper.prototype.getRowClass = function() { return this.gridOptions.rowClass; };
GridOptionsWrapper.prototype.getHeaderCellRenderer = function() { return this.gridOptions.headerCellRenderer; };
GridOptionsWrapper.prototype.getApi = function() { return this.gridOptions.api; };
GridOptionsWrapper.prototype.isEnableColResize = function() { return this.gridOptions.enableColResize; };
GridOptionsWrapper.prototype.getGroupDefaultExpanded = function() { return this.gridOptions.groupDefaultExpanded; };
GridOptionsWrapper.prototype.getGroupKeys = function() { return this.gridOptions.groupKeys; };
GridOptionsWrapper.prototype.getGroupAggFunction = function() { return this.gridOptions.groupAggFunction; };
GridOptionsWrapper.prototype.getGroupAggFields = function() { return this.gridOptions.groupAggFields; };
GridOptionsWrapper.prototype.getAllRows = function() { return this.gridOptions.rowData; };
GridOptionsWrapper.prototype.isGroupUseEntireRow = function() { return isTrue(this.gridOptions.groupUseEntireRow); };
GridOptionsWrapper.prototype.getGroupColumnDef = function() { return this.gridOptions.groupColumnDef; };
GridOptionsWrapper.prototype.isAngularCompileRows = function() { return isTrue(this.gridOptions.angularCompileRows); };
GridOptionsWrapper.prototype.isAngularCompileFilters = function() { return isTrue(this.gridOptions.angularCompileFilters); };
GridOptionsWrapper.prototype.isAngularCompileHeaders = function() { return isTrue(this.gridOptions.angularCompileHeaders); };
GridOptionsWrapper.prototype.getColumnDefs = function() { return this.gridOptions.columnDefs; };
GridOptionsWrapper.prototype.getRowHeight = function() { return this.gridOptions.rowHeight; };
GridOptionsWrapper.prototype.getModelUpdated = function() { return this.gridOptions.modelUpdated; };
GridOptionsWrapper.prototype.getCellClicked = function() { return this.gridOptions.cellClicked; };
GridOptionsWrapper.prototype.getCellDoubleClicked = function() { return this.gridOptions.cellDoubleClicked; };
GridOptionsWrapper.prototype.getCellValueChanged = function() { return this.gridOptions.cellValueChanged; };
GridOptionsWrapper.prototype.getCellFocused = function() { return this.gridOptions.cellFocused; };
GridOptionsWrapper.prototype.getRowSelected = function() { return this.gridOptions.rowSelected; };
GridOptionsWrapper.prototype.getSelectionChanged = function() { return this.gridOptions.selectionChanged; };
GridOptionsWrapper.prototype.getVirtualRowRemoved = function() { return this.gridOptions.virtualRowRemoved; };
GridOptionsWrapper.prototype.getDatasource = function() { return this.gridOptions.datasource; };
GridOptionsWrapper.prototype.getReady = function() { return this.gridOptions.ready; };
GridOptionsWrapper.prototype.getRowBuffer = function() { return this.gridOptions.rowBuffer; };

GridOptionsWrapper.prototype.getGroupRowInnerRenderer = function() {
    if (this.gridOptions.groupInnerRenderer) {
        console.warn('ag-grid: as of v1.10.0 (21st Jun 2015) groupInnerRenderer is nwo called groupRowInnerRenderer. Please change you code as groupInnerRenderer is deprecated.');
        return this.gridOptions.groupInnerRenderer;
    } else {
        return this.gridOptions.groupRowInnerRenderer;
    }
};

GridOptionsWrapper.prototype.getColWidth = function() {
    if (typeof this.gridOptions.colWidth !== 'number' ||  this.gridOptions.colWidth < constants.MIN_COL_WIDTH) {
        return 200;
    } else  {
        return this.gridOptions.colWidth;
    }
};

GridOptionsWrapper.prototype.isEnableSorting = function() { return isTrue(this.gridOptions.enableSorting) || isTrue(this.gridOptions.enableServerSideSorting); };
GridOptionsWrapper.prototype.isEnableServerSideSorting = function() { return isTrue(this.gridOptions.enableServerSideSorting); };

GridOptionsWrapper.prototype.isEnableFilter = function() { return isTrue(this.gridOptions.enableFilter) || isTrue(this.gridOptions.enableServerSideFilter); };
GridOptionsWrapper.prototype.isEnableServerSideFilter = function() { return this.gridOptions.enableServerSideFilter; };

GridOptionsWrapper.prototype.setSelectedRows = function(newSelectedRows) {
    return this.gridOptions.selectedRows = newSelectedRows;
};
GridOptionsWrapper.prototype.setSelectedNodesById = function(newSelectedNodes) {
    return this.gridOptions.selectedNodesById = newSelectedNodes;
};

GridOptionsWrapper.prototype.getIcons = function() {
    return this.gridOptions.icons;
};

GridOptionsWrapper.prototype.isDoInternalExpanding = function() {
    return !this.isRowsAlreadyExpanded() && this.gridOptions.expandRow;
};

GridOptionsWrapper.prototype.getHeaderHeight = function() {
    if (typeof this.gridOptions.headerHeight === 'number') {
        // if header height provided, used it
        return this.gridOptions.headerHeight;
    } else {
        // otherwise return 25 if no grouping, 50 if grouping
        if (this.isGroupHeaders()) {
            return 50;
        } else {
            return 25;
        }
    }
};

GridOptionsWrapper.prototype.setupDefaults = function() {
    if (!this.gridOptions.rowHeight) {
        this.gridOptions.rowHeight = DEFAULT_ROW_HEIGHT;
    }
};

GridOptionsWrapper.prototype.getPinnedColCount = function() {
    // if not using scrolls, then pinned columns doesn't make
    // sense, so always return 0
    if (this.isDontUseScrolls()) {
        return 0;
    }
    if (this.gridOptions.pinnedColumnCount) {
        //in case user puts in a string, cast to number
        return Number(this.gridOptions.pinnedColumnCount);
    } else {
        return 0;
    }
};

GridOptionsWrapper.prototype.getLocaleTextFunc = function() {
    var that = this;
    return function (key, defaultValue) {
        var localeText = that.gridOptions.localeText;
        if (localeText && localeText[key]) {
            return localeText[key];
        } else {
            return defaultValue;
        }
    };
};

module.exports = GridOptionsWrapper;

},{"./constants":4}],18:[function(require,module,exports){
module.exports = "<div><div class=ag-header><div class=ag-pinned-header></div><div class=ag-header-viewport><div class=ag-header-container></div></div></div><div class=ag-body><div class=ag-pinned-cols-viewport><div class=ag-pinned-cols-container></div></div><div class=ag-body-viewport-wrapper><div class=ag-body-viewport><div class=ag-body-container></div></div></div></div></div>";

},{}],19:[function(require,module,exports){
module.exports = "<div><div class=ag-header-container></div><div class=ag-body-container></div></div>";

},{}],20:[function(require,module,exports){
var gridHtml = require('./grid.html');
var gridNoScrollsHtml = require('./gridNoScrolls.html');
var loadingHtml = require('./loading.html');
var BorderLayout = require('../layout/borderLayout');
var utils = require('../utils');

function GridPanel(gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    // makes code below more readable if we pull 'forPrint' out
    this.forPrint = this.gridOptionsWrapper.isDontUseScrolls();
    this.setupComponents();
    this.scrollWidth = utils.getScrollbarWidth();
}

GridPanel.prototype.setupComponents = function() {

    if (this.forPrint) {
        this.eRoot = utils.loadTemplate(gridNoScrollsHtml);
        utils.addCssClass(this.eRoot, 'ag-root ag-no-scrolls');
    } else {
        this.eRoot = utils.loadTemplate(gridHtml);
        utils.addCssClass(this.eRoot, 'ag-root ag-scrolls');
    }

    this.findElements();

    this.layout = new BorderLayout({
        overlay: utils.loadTemplate(loadingHtml),
        center: this.eRoot,
        dontFill: this.forPrint,
        name: 'eGridPanel'
    });

    this.addScrollListener();
};

GridPanel.prototype.ensureIndexVisible = function(index) {
    var lastRow = this.rowModel.getVirtualRowCount();
    if (typeof index !== 'number' || index < 0 || index >= lastRow) {
        console.warn('invalid row index for ensureIndexVisible: ' + index);
        return;
    }

    var rowHeight = this.gridOptionsWrapper.getRowHeight();
    var rowTopPixel = rowHeight * index;
    var rowBottomPixel = rowTopPixel + rowHeight;

    var viewportTopPixel = this.eBodyViewport.scrollTop;
    var viewportHeight = this.eBodyViewport.offsetHeight;
    var scrollShowing = this.eBodyViewport.clientWidth < this.eBodyViewport.scrollWidth;
    if (scrollShowing) {
        viewportHeight -= this.scrollWidth;
    }
    var viewportBottomPixel = viewportTopPixel + viewportHeight;

    var viewportScrolledPastRow = viewportTopPixel > rowTopPixel;
    var viewportScrolledBeforeRow = viewportBottomPixel < rowBottomPixel;

    if (viewportScrolledPastRow) {
        // if row is before, scroll up with row at top
        this.eBodyViewport.scrollTop = rowTopPixel;
    } else if (viewportScrolledBeforeRow) {
        // if row is below, scroll down with row at bottom
        var newScrollPosition = rowBottomPixel - viewportHeight;
        this.eBodyViewport.scrollTop = newScrollPosition;
    }
    // otherwise, row is already in view, so do nothing
};

GridPanel.prototype.ensureColIndexVisible = function(index) {
    if (typeof index !== 'number') {
        console.warn('col index must be a number: ' + index);
        return;
    }

    var columns = this.columnModel.getDisplayedColumns();
    if (typeof index !== 'number' || index < 0 || index >= columns.length) {
        console.warn('invalid col index for ensureColIndexVisible: ' + index
            + ', should be between 0 and ' + (columns.length - 1));
        return;
    }

    var column = columns[index];
    var pinnedColCount = this.gridOptionsWrapper.getPinnedColCount();
    if (index < pinnedColCount) {
        console.warn('invalid col index for ensureColIndexVisible: ' + index
            + ', scrolling to a pinned col makes no sense');
        return;
    }

    // sum up all col width to the let to get the start pixel
    var colLeftPixel = 0;
    for (var i = pinnedColCount; i<index; i++) {
        colLeftPixel += columns[i].actualWidth;
    }

    var colRightPixel = colLeftPixel + column.actualWidth;

    var viewportLeftPixel = this.eBodyViewport.scrollLeft;
    var viewportWidth = this.eBodyViewport.offsetWidth;

    var scrollShowing = this.eBodyViewport.clientHeight < this.eBodyViewport.scrollHeight;
    if (scrollShowing) {
        viewportWidth -= this.scrollWidth;
    }

    var viewportRightPixel = viewportLeftPixel + viewportWidth;

    var viewportScrolledPastCol = viewportLeftPixel > colLeftPixel;
    var viewportScrolledBeforeCol = viewportRightPixel < colRightPixel;

    if (viewportScrolledPastCol) {
        // if viewport's left side is after col's left side, scroll right to pull col into viewport at left
        this.eBodyViewport.scrollLeft = colLeftPixel;
    } else if (viewportScrolledBeforeCol) {
        // if viewport's right side is before col's right side, scroll left to pull col into viewport at right
        var newScrollPosition = colRightPixel - viewportWidth;
        this.eBodyViewport.scrollLeft = newScrollPosition;
    }
    // otherwise, col is already in view, so do nothing
};

GridPanel.prototype.showLoading = function(loading) {
    this.layout.setOverlayVisible(loading);
};

GridPanel.prototype.getWidthForSizeColsToFit = function() {
    var availableWidth = this.eBody.clientWidth;
    var scrollShowing = this.eBodyViewport.clientHeight < this.eBodyViewport.scrollHeight;
    if (scrollShowing) {
        availableWidth -= this.scrollWidth;
    }
    return availableWidth;
};

GridPanel.prototype.init = function(columnModel, rowRenderer) {
    this.columnModel = columnModel;
    this.rowRenderer = rowRenderer;
};

GridPanel.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

GridPanel.prototype.getBodyContainer = function() { return this.eBodyContainer; };

GridPanel.prototype.getBodyViewport = function() { return this.eBodyViewport; };

GridPanel.prototype.getPinnedColsContainer = function() { return this.ePinnedColsContainer; };

GridPanel.prototype.getHeaderContainer = function() { return this.eHeaderContainer; };

GridPanel.prototype.getRoot = function() { return this.eRoot; };

GridPanel.prototype.getPinnedHeader = function() { return this.ePinnedHeader; };

GridPanel.prototype.getHeader = function() { return this.eHeader; };

GridPanel.prototype.getRowsParent = function() { return this.eParentOfRows; };

GridPanel.prototype.findElements = function() {
    if (this.forPrint) {
        this.eHeaderContainer = this.eRoot.querySelector(".ag-header-container");
        this.eBodyContainer = this.eRoot.querySelector(".ag-body-container");
        // for no-scrolls, all rows live in the body container
        this.eParentOfRows = this.eBodyContainer;
    } else {
        this.eBody = this.eRoot.querySelector(".ag-body");
        this.eBodyContainer = this.eRoot.querySelector(".ag-body-container");
        this.eBodyViewport = this.eRoot.querySelector(".ag-body-viewport");
        this.eBodyViewportWrapper = this.eRoot.querySelector(".ag-body-viewport-wrapper");
        this.ePinnedColsContainer = this.eRoot.querySelector(".ag-pinned-cols-container");
        this.ePinnedColsViewport = this.eRoot.querySelector(".ag-pinned-cols-viewport");
        this.ePinnedHeader = this.eRoot.querySelector(".ag-pinned-header");
        this.eHeader = this.eRoot.querySelector(".ag-header");
        this.eHeaderContainer = this.eRoot.querySelector(".ag-header-container");
        // for scrolls, all rows live in eBody (containing pinned and normal body)
        this.eParentOfRows = this.eBody;
    }
};

GridPanel.prototype.setBodyContainerWidth = function() {
    var mainRowWidth = this.columnModel.getBodyContainerWidth() + "px";
    this.eBodyContainer.style.width = mainRowWidth;
};

GridPanel.prototype.setPinnedColContainerWidth = function() {
    var pinnedColWidth = this.columnModel.getPinnedContainerWidth() + "px";
    this.ePinnedColsContainer.style.width = pinnedColWidth;
    this.eBodyViewportWrapper.style.marginLeft = pinnedColWidth;
};

GridPanel.prototype.showPinnedColContainersIfNeeded = function() {
    // no need to do this if not using scrolls
    if (this.forPrint) {
        return;
    }

    var showingPinnedCols = this.gridOptionsWrapper.getPinnedColCount() > 0;

    //some browsers had layout issues with the blank divs, so if blank,
    //we don't display them
    if (showingPinnedCols) {
        this.ePinnedHeader.style.display = 'inline-block';
        this.ePinnedColsViewport.style.display = 'inline';
    } else {
        this.ePinnedHeader.style.display = 'none';
        this.ePinnedColsViewport.style.display = 'none';
    }
};

GridPanel.prototype.setHeaderHeight = function() {
    var headerHeight = this.gridOptionsWrapper.getHeaderHeight();
    var headerHeightPixels = headerHeight + 'px';
    if (this.forPrint) {
        this.eHeaderContainer.style['height'] = headerHeightPixels;
    } else {
        this.eHeader.style['height'] = headerHeightPixels;
        this.eBody.style['paddingTop'] = headerHeightPixels;
    }
};

// see if a grey box is needed at the bottom of the pinned col
GridPanel.prototype.setPinnedColHeight = function() {
    if (!this.forPrint) {
        var bodyHeight = this.eBodyViewport.offsetHeight;
        this.ePinnedColsViewport.style.height = bodyHeight + "px";
    }
};

GridPanel.prototype.addScrollListener = function() {
    // if printing, then no scrolling, so no point in listening for scroll events
    if (this.forPrint) {
        return;
    }

    var that = this;
    var lastLeftPosition = -1;
    var lastTopPosition = -1;

    this.eBodyViewport.addEventListener("scroll", function() {
        var newLeftPosition = that.eBodyViewport.scrollLeft;
        var newTopPosition = that.eBodyViewport.scrollTop;

        if (newLeftPosition !== lastLeftPosition) {
            lastLeftPosition = newLeftPosition;
            that.scrollHeader(newLeftPosition);
        }

        if (newTopPosition !== lastTopPosition) {
            lastTopPosition = newTopPosition;
            that.scrollPinned(newTopPosition);
            that.rowRenderer.drawVirtualRows();
        }
    });

    this.ePinnedColsViewport.addEventListener("scroll", function() {
        // this means the pinned panel was moved, which can only
        // happen when the user is navigating in the pinned container
        // as the pinned col should never scroll. so we rollback
        // the scroll on the pinned.
        that.ePinnedColsViewport.scrollTop = 0;
    });

};

GridPanel.prototype.scrollHeader = function(bodyLeftPosition) {
    // this.eHeaderContainer.style.transform = 'translate3d(' + -bodyLeftPosition + "px,0,0)";
    this.eHeaderContainer.style.left = -bodyLeftPosition + "px";
};

GridPanel.prototype.scrollPinned = function(bodyTopPosition) {
    // this.ePinnedColsContainer.style.transform = 'translate3d(0,' + -bodyTopPosition + "px,0)";
    this.ePinnedColsContainer.style.top = -bodyTopPosition + "px";
};

module.exports = GridPanel;
},{"../layout/borderLayout":25,"../utils":39,"./grid.html":18,"./gridNoScrolls.html":19,"./loading.html":21}],21:[function(require,module,exports){
module.exports = "<div class=ag-loading-panel><div class=ag-loading-wrapper><span class=ag-loading-center>Loading...</span></div></div>";

},{}],22:[function(require,module,exports){
function GroupCreator() {}

GroupCreator.prototype.group = function(rowNodes, groupedCols, groupAggFunction, expandByDefault) {

    var topMostGroup = {
        level: -1,
        children: [],
        childrenMap: {}
    };

    var allGroups = [];
    allGroups.push(topMostGroup);

    var levelToInsertChild = groupedCols.length - 1;
    var i, currentLevel, node, data, currentGroup, groupByField, groupKey, nextGroup;

    // start at -1 and go backwards, as all the positive indexes
    // are already used by the nodes.
    var index = -1;

    for (i = 0; i < rowNodes.length; i++) {
        node = rowNodes[i];
        data = node.data;

        // all leaf nodes have the same level in this grouping, which is one level after the last group
        node.level = levelToInsertChild + 1;

        for (currentLevel = 0; currentLevel < groupedCols.length; currentLevel++) {
            groupByField = groupedCols[currentLevel].colDef.field;
            groupKey = data[groupByField];

            if (currentLevel == 0) {
                currentGroup = topMostGroup;
            }

            // if group doesn't exist yet, create it
            nextGroup = currentGroup.childrenMap[groupKey];
            if (!nextGroup) {
                nextGroup = {
                    group: true,
                    field: groupByField,
                    id: index--,
                    key: groupKey,
                    expanded: this.isExpanded(expandByDefault, currentLevel),
                    children: [],
                    // for top most level, parent is null
                    parent: currentGroup === topMostGroup ? null : currentGroup,
                    allChildrenCount: 0,
                    level: currentGroup.level + 1,
                    childrenMap: {} //this is a temporary map, we remove at the end of this method
                };
                currentGroup.childrenMap[groupKey] = nextGroup;
                currentGroup.children.push(nextGroup);
                allGroups.push(nextGroup);
            }

            nextGroup.allChildrenCount++;

            if (currentLevel == levelToInsertChild) {
                node.parent = nextGroup === topMostGroup ? null : nextGroup;
                nextGroup.children.push(node);
            } else {
                currentGroup = nextGroup;
            }
        }

    }

    //remove the temporary map
    for (i = 0; i < allGroups.length; i++) {
        delete allGroups[i].childrenMap;
    }

    return topMostGroup.children;
};

GroupCreator.prototype.isExpanded = function(expandByDefault, level) {
    if (typeof expandByDefault === 'number') {
        return level < expandByDefault;
    } else {
        return expandByDefault === true || expandByDefault === 'true';
    }
};

module.exports = new GroupCreator();

},{}],23:[function(require,module,exports){
var utils = require('./utils');
var SvgFactory = require('./svgFactory');
var constants = require('./constants');

var svgFactory = new SvgFactory();

function HeaderRenderer() {}

HeaderRenderer.prototype.init = function(gridOptionsWrapper, columnController, columnModel, gridPanel, angularGrid, filterManager, $scope, $compile, expressionService) {
    this.expressionService = expressionService;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.columnModel = columnModel;
    this.columnController = columnController;
    this.angularGrid = angularGrid;
    this.filterManager = filterManager;
    this.$scope = $scope;
    this.$compile = $compile;
    this.findAllElements(gridPanel);
};

HeaderRenderer.prototype.findAllElements = function(gridPanel) {
    this.ePinnedHeader = gridPanel.getPinnedHeader();
    this.eHeaderContainer = gridPanel.getHeaderContainer();
    this.eHeader = gridPanel.getHeader();
    this.eRoot = gridPanel.getRoot();
};

HeaderRenderer.prototype.refreshHeader = function() {
    utils.removeAllChildren(this.ePinnedHeader);
    utils.removeAllChildren(this.eHeaderContainer);

    if (this.childScopes) {
        this.childScopes.forEach(function(childScope) {
            childScope.$destroy();
        });
    }
    this.childScopes = [];

    if (this.gridOptionsWrapper.isGroupHeaders()) {
        this.insertHeadersWithGrouping();
    } else {
        this.insertHeadersWithoutGrouping();
    }

};

HeaderRenderer.prototype.insertHeadersWithGrouping = function() {
    var groups = this.columnModel.getHeaderGroups();
    var that = this;
    groups.forEach(function(group) {
        var eHeaderCell = that.createGroupedHeaderCell(group);
        var eContainerToAddTo = group.pinned ? that.ePinnedHeader : that.eHeaderContainer;
        eContainerToAddTo.appendChild(eHeaderCell);
    });
};

HeaderRenderer.prototype.createGroupedHeaderCell = function(group) {

    var eHeaderGroup = document.createElement('div');
    eHeaderGroup.className = 'ag-header-group';

    var eHeaderGroupCell = document.createElement('div');
    group.eHeaderGroupCell = eHeaderGroupCell;
    var classNames = ['ag-header-group-cell'];
    // having different classes below allows the style to not have a bottom border
    // on the group header, if no group is specified
    if (group.name) {
        classNames.push('ag-header-group-cell-with-group');
    } else {
        classNames.push('ag-header-group-cell-no-group');
    }
    eHeaderGroupCell.className = classNames.join(' ');

    if (this.gridOptionsWrapper.isEnableColResize()) {
        var eHeaderCellResize = document.createElement("div");
        eHeaderCellResize.className = "ag-header-cell-resize";
        eHeaderGroupCell.appendChild(eHeaderCellResize);
        group.eHeaderCellResize = eHeaderCellResize;
        var dragCallback = this.groupDragCallbackFactory(group);
        this.addDragHandler(eHeaderCellResize, dragCallback);
    }

    // no renderer, default text render
    var groupName = group.name;
    if (groupName && groupName !== '') {
        var eGroupCellLabel = document.createElement("div");
        eGroupCellLabel.className = 'ag-header-group-cell-label';
        eHeaderGroupCell.appendChild(eGroupCellLabel);

        var eInnerText = document.createElement("span");
        eInnerText.className = 'ag-header-group-text';
        eInnerText.innerHTML = groupName;
        eGroupCellLabel.appendChild(eInnerText);

        if (group.expandable) {
            this.addGroupExpandIcon(group, eGroupCellLabel, group.expanded);
        }
    }
    eHeaderGroup.appendChild(eHeaderGroupCell);

    var that = this;
    group.displayedColumns.forEach(function(column) {
        var eHeaderCell = that.createHeaderCell(column, true, group);
        eHeaderGroup.appendChild(eHeaderCell);
    });

    that.setWidthOfGroupHeaderCell(group);

    return eHeaderGroup;
};

HeaderRenderer.prototype.addGroupExpandIcon = function(group, eHeaderGroup, expanded) {
    var eGroupIcon;
    if (expanded) {
        eGroupIcon = utils.createIcon('headerGroupOpened', this.gridOptionsWrapper, null, svgFactory.createArrowLeftSvg);
    } else {
        eGroupIcon = utils.createIcon('headerGroupClosed', this.gridOptionsWrapper, null, svgFactory.createArrowRightSvg);
    }
    eGroupIcon.className = 'ag-header-expand-icon';
    eHeaderGroup.appendChild(eGroupIcon);

    var that = this;
    eGroupIcon.onclick = function() {
        that.columnController.headerGroupOpened(group);
    };
};

HeaderRenderer.prototype.addDragHandler = function(eDraggableElement, dragCallback) {
    var that = this;
    eDraggableElement.addEventListener('mousedown', function(downEvent) {
        dragCallback.onDragStart();
        that.eRoot.style.cursor = "col-resize";
        that.dragStartX = downEvent.clientX;

        var listenersToRemove = {};

        listenersToRemove.mousemove = function (moveEvent) {
            var newX = moveEvent.clientX;
            var change = newX - that.dragStartX;
            dragCallback.onDragging(change);
        };

        listenersToRemove.mouseup = function () {
            that.stopDragging(listenersToRemove);
        };

        listenersToRemove.mouseleave = function () {
            that.stopDragging(listenersToRemove);
        };

        that.eRoot.addEventListener('mousemove', listenersToRemove.mousemove);
        that.eRoot.addEventListener('mouseup', listenersToRemove.mouseup);
        that.eRoot.addEventListener('mouseleave', listenersToRemove.mouseleave);
    });
};

HeaderRenderer.prototype.setWidthOfGroupHeaderCell = function(headerGroup) {
    var totalWidth = 0;
    headerGroup.displayedColumns.forEach(function(column) {
        totalWidth += column.actualWidth;
    });
    headerGroup.eHeaderGroupCell.style.width = utils.formatWidth(totalWidth);
    headerGroup.actualWidth = totalWidth;
};

HeaderRenderer.prototype.insertHeadersWithoutGrouping = function() {
    var ePinnedHeader = this.ePinnedHeader;
    var eHeaderContainer = this.eHeaderContainer;
    var that = this;

    this.columnModel.getDisplayedColumns().forEach(function(column) {
        // only include the first x cols
        var headerCell = that.createHeaderCell(column, false);
        if (column.pinned) {
            ePinnedHeader.appendChild(headerCell);
        } else {
            eHeaderContainer.appendChild(headerCell);
        }
    });
};

HeaderRenderer.prototype.createHeaderCell = function(column, grouped, headerGroup) {
    var that = this;
    var colDef = column.colDef;
    var eHeaderCell = document.createElement("div");
    // stick the header cell in column, as we access it when group is re-sized
    column.eHeaderCell = eHeaderCell;

    var newChildScope;
    if (this.gridOptionsWrapper.isAngularCompileHeaders()) {
        newChildScope = this.$scope.$new();
        newChildScope.colDef = colDef;
        newChildScope.colIndex = colDef.index;
        newChildScope.colDefWrapper = column;
        this.childScopes.push(newChildScope);
    }

    var headerCellClasses = ['ag-header-cell'];
    if (grouped) {
        headerCellClasses.push('ag-header-cell-grouped'); // this takes 50% height
    } else {
        headerCellClasses.push('ag-header-cell-not-grouped'); // this takes 100% height
    }
    eHeaderCell.className = headerCellClasses.join(' ');

    this.addHeaderClassesFromCollDef(colDef, newChildScope, eHeaderCell);

    // add tooltip if exists
    if (colDef.headerTooltip) {
        eHeaderCell.title = colDef.headerTooltip;
    }

    if (this.gridOptionsWrapper.isEnableColResize() && !colDef.suppressResize) {
        var headerCellResize = document.createElement("div");
        headerCellResize.className = "ag-header-cell-resize";
        eHeaderCell.appendChild(headerCellResize);
        var dragCallback = this.headerDragCallbackFactory(eHeaderCell, column, headerGroup);
        this.addDragHandler(headerCellResize, dragCallback);
    }

    // filter button
    var showMenu = this.gridOptionsWrapper.isEnableFilter() && !colDef.suppressMenu;
    if (showMenu) {
        var eMenuButton = utils.createIcon('menu', this.gridOptionsWrapper, column, svgFactory.createMenuSvg);
        utils.addCssClass(eMenuButton, 'ag-header-icon');

        eMenuButton.setAttribute("class", "ag-header-cell-menu-button");
        eMenuButton.onclick = function() {
            that.filterManager.showFilter(column, this);
        };
        eHeaderCell.appendChild(eMenuButton);
        eHeaderCell.onmouseenter = function() {
            eMenuButton.style.opacity = 1;
        };
        eHeaderCell.onmouseleave = function() {
            eMenuButton.style.opacity = 0;
        };
        eMenuButton.style.opacity = 0;
        eMenuButton.style["-webkit-transition"] = "opacity 0.5s, border 0.2s";
        eMenuButton.style["transition"] = "opacity 0.5s, border 0.2s";
    }

    // label div
    var headerCellLabel = document.createElement("div");
    headerCellLabel.className = "ag-header-cell-label";

    // add in sort icons
    if (this.gridOptionsWrapper.isEnableSorting() && !colDef.suppressSorting) {
        column.eSortAsc = utils.createIcon('sortAscending', this.gridOptionsWrapper, column, svgFactory.createArrowDownSvg);
        column.eSortDesc = utils.createIcon('sortDescending', this.gridOptionsWrapper, column, svgFactory.createArrowUpSvg);
        utils.addCssClass(column.eSortAsc, 'ag-header-icon');
        utils.addCssClass(column.eSortDesc, 'ag-header-icon');
        headerCellLabel.appendChild(column.eSortAsc);
        headerCellLabel.appendChild(column.eSortDesc);
        column.eSortAsc.style.display = 'none';
        column.eSortDesc.style.display = 'none';
        this.addSortHandling(headerCellLabel, column);
    }

    // add in filter icon
    column.eFilterIcon = utils.createIcon('filter', this.gridOptionsWrapper, column, svgFactory.createFilterSvg);
    utils.addCssClass(column.eFilterIcon, 'ag-header-icon');
    headerCellLabel.appendChild(column.eFilterIcon);

    // render the cell, use a renderer if one is provided
    var headerCellRenderer;
    if (colDef.headerCellRenderer) { // first look for a renderer in col def
        headerCellRenderer = colDef.headerCellRenderer;
    } else if (this.gridOptionsWrapper.getHeaderCellRenderer()) { // second look for one in grid options
        headerCellRenderer = this.gridOptionsWrapper.getHeaderCellRenderer();
    }

    var headerNameValue = this.columnModel.getDisplayNameForCol(column);

    if (headerCellRenderer) {
        // renderer provided, use it
        var cellRendererParams = {
            colDef: colDef,
            $scope: newChildScope,
            context: this.gridOptionsWrapper.getContext(),
            value: headerNameValue,
            api: this.gridOptionsWrapper.getApi()
        };
        var cellRendererResult = headerCellRenderer(cellRendererParams);
        var childToAppend;
        if (utils.isNodeOrElement(cellRendererResult)) {
            // a dom node or element was returned, so add child
            childToAppend = cellRendererResult;
        } else {
            // otherwise assume it was html, so just insert
            var eTextSpan = document.createElement("span");
            eTextSpan.innerHTML = cellRendererResult;
            childToAppend = eTextSpan;
        }
        // angular compile header if option is turned on
        if (this.gridOptionsWrapper.isAngularCompileHeaders()) {
            var childToAppendCompiled = this.$compile(childToAppend)(newChildScope)[0];
            headerCellLabel.appendChild(childToAppendCompiled);
        } else {
            headerCellLabel.appendChild(childToAppend);
        }
    } else {
        // no renderer, default text render
        var eInnerText = document.createElement("span");
        eInnerText.className = 'ag-header-cell-text';
        eInnerText.innerHTML = headerNameValue;
        headerCellLabel.appendChild(eInnerText);
    }

    eHeaderCell.appendChild(headerCellLabel);
    eHeaderCell.style.width = utils.formatWidth(column.actualWidth);

    return eHeaderCell;
};

HeaderRenderer.prototype.addHeaderClassesFromCollDef = function(colDef, $childScope, eHeaderCell) {
    if (colDef.headerClass) {
        var classToUse;
        if (typeof colDef.headerClass === 'function') {
            var params = {
                colDef: colDef,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            classToUse = colDef.headerClass(params);
        } else {
            classToUse = colDef.headerClass;
        }

        if (typeof classToUse === 'string') {
            utils.addCssClass(eHeaderCell, classToUse);
        } else if (Array.isArray(classToUse)) {
            classToUse.forEach(function(cssClassItem) {
                utils.addCssClass(eHeaderCell, cssClassItem);
            });
        }
    }
};

HeaderRenderer.prototype.getNextSortDirection = function(direction) {
    var suppressUnSort = this.gridOptionsWrapper.isSuppressUnSort();
    var suppressDescSort = this.gridOptionsWrapper.isSuppressDescSort();

    switch (direction) {
        case constants.DESC:
            if (suppressUnSort) {
                return constants.ASC;
            } else {
                return null;
            }
        case constants.ASC:
            if (suppressUnSort && suppressDescSort) {
                return constants.ASC;
            } else if (suppressDescSort) {
                return null;
            } else {
                return constants.DESC;
            }
        default :
            return constants.ASC;
    }
};

HeaderRenderer.prototype.addSortHandling = function(headerCellLabel, column) {
    var that = this;

    headerCellLabel.addEventListener("click", function(e) {

        // update sort on current col
        column.sort = that.getNextSortDirection(column.sort);

        // sortedAt used for knowing order of cols when multi-col sort
        if (column.sort) {
            column.sortedAt = new Date().valueOf();
        } else {
            column.sortedAt = null;
        }

        var doingMultiSort = !that.gridOptionsWrapper.isSuppressMultiSort() && e.shiftKey;

        // clear sort on all columns except this one, and update the icons
        that.columnModel.getAllColumns().forEach(function(columnToClear) {
            // Do not clear if either holding shift, or if column in question was clicked
            if (!(doingMultiSort || columnToClear === column)) {
                columnToClear.sort = null;
            }
        });

        that.angularGrid.onSortingChanged();
    });
};

HeaderRenderer.prototype.updateSortIcons = function() {
    this.columnModel.getAllColumns().forEach(function(column) {
        // update visibility of icons
        var sortAscending = column.sort === constants.ASC;
        var sortDescending = column.sort === constants.DESC;

        if (column.eSortAsc) {
            utils.setVisible(column.eSortAsc, sortAscending);
        }
        if (column.eSortDesc) {
            utils.setVisible(column.eSortDesc, sortDescending);
        }
    });
};

HeaderRenderer.prototype.groupDragCallbackFactory = function(currentGroup) {
    var parent = this;
    var displayedColumns = currentGroup.displayedColumns;
    return {
        onDragStart: function() {
            this.groupWidthStart = currentGroup.actualWidth;
            this.childrenWidthStarts = [];
            var that = this;
            displayedColumns.forEach(function(colDefWrapper) {
                that.childrenWidthStarts.push(colDefWrapper.actualWidth);
            });
            this.minWidth = displayedColumns.length * constants.MIN_COL_WIDTH;
        },
        onDragging: function(dragChange) {

            var newWidth = this.groupWidthStart + dragChange;
            if (newWidth < this.minWidth) {
                newWidth = this.minWidth;
            }

            // set the new width to the group header
            var newWidthPx = newWidth + "px";
            currentGroup.eHeaderGroupCell.style.width = newWidthPx;
            currentGroup.actualWidth = newWidth;

            // distribute the new width to the child headers
            var changeRatio = newWidth / this.groupWidthStart;
            // keep track of pixels used, and last column gets the remaining,
            // to cater for rounding errors, and min width adjustments
            var pixelsToDistribute = newWidth;
            var that = this;
            currentGroup.displayedColumns.forEach(function(colDefWrapper, index) {
                var notLastCol = index !== (displayedColumns.length - 1);
                var newChildSize;
                if (notLastCol) {
                    // if not the last col, calculate the column width as normal
                    var startChildSize = that.childrenWidthStarts[index];
                    newChildSize = startChildSize * changeRatio;
                    if (newChildSize < constants.MIN_COL_WIDTH) {
                        newChildSize = constants.MIN_COL_WIDTH;
                    }
                    pixelsToDistribute -= newChildSize;
                } else {
                    // if last col, give it the remaining pixels
                    newChildSize = pixelsToDistribute;
                }
                var eHeaderCell = displayedColumns[index].eHeaderCell;
                parent.adjustColumnWidth(newChildSize, colDefWrapper, eHeaderCell);
            });

            // should not be calling these here, should do something else
            if (currentGroup.pinned) {
                parent.angularGrid.updatePinnedColContainerWidthAfterColResize();
            } else {
                parent.angularGrid.updateBodyContainerWidthAfterColResize();
            }
        }
    };
};

HeaderRenderer.prototype.adjustColumnWidth = function(newWidth, column, eHeaderCell) {
    var newWidthPx = newWidth + "px";
    var selectorForAllColsInCell = ".cell-col-" + column.index;
    var cellsForThisCol = this.eRoot.querySelectorAll(selectorForAllColsInCell);
    for (var i = 0; i < cellsForThisCol.length; i++) {
        cellsForThisCol[i].style.width = newWidthPx;
    }

    eHeaderCell.style.width = newWidthPx;
    column.actualWidth = newWidth;
};

// gets called when a header (not a header group) gets resized
HeaderRenderer.prototype.headerDragCallbackFactory = function(headerCell, column, headerGroup) {
    var parent = this;
    return {
        onDragStart: function() {
            this.startWidth = column.actualWidth;
        },
        onDragging: function(dragChange) {
            var newWidth = this.startWidth + dragChange;
            if (newWidth < constants.MIN_COL_WIDTH) {
                newWidth = constants.MIN_COL_WIDTH;
            }

            parent.adjustColumnWidth(newWidth, column, headerCell);

            if (headerGroup) {
                parent.setWidthOfGroupHeaderCell(headerGroup);
            }

            // should not be calling these here, should do something else
            if (column.pinned) {
                parent.angularGrid.updatePinnedColContainerWidthAfterColResize();
            } else {
                parent.angularGrid.updateBodyContainerWidthAfterColResize();
            }
        }
    };
};

HeaderRenderer.prototype.stopDragging = function(listenersToRemove) {
    this.eRoot.style.cursor = "";
    var that = this;
    utils.iterateObject(listenersToRemove, function(key, listener) {
        that.eRoot.removeEventListener(key, listener);
    });
};

HeaderRenderer.prototype.updateFilterIcons = function() {
    var that = this;
    this.columnModel.getDisplayedColumns().forEach(function(column) {
        // todo: need to change this, so only updates if column is visible
        if (column.eFilterIcon) {
            var filterPresent = that.filterManager.isFilterPresentForCol(column.colId);
            var displayStyle = filterPresent ? 'inline' : 'none';
            column.eFilterIcon.style.display = displayStyle;
        }
    });
};

module.exports = HeaderRenderer;

},{"./constants":4,"./svgFactory":34,"./utils":39}],24:[function(require,module,exports){
var utils = require('../utils');

function BorderLayout(params) {

    this.isLayoutPanel = true;

    this.fullHeight = !params.north && !params.south;

    var template;
    if (!params.dontFill) {
        if (this.fullHeight) {
            template =
                '<div style="height: 100%; overflow: auto; position: relative;">' +
                '<div id="west" style="height: 100%; float: left;"></div>' +
                '<div id="east" style="height: 100%; float: right;"></div>' +
                '<div id="center" style="height: 100%;"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
                '</div>';
        } else {
            template =
                '<div style="height: 100%; position: relative;">' +
                '<div id="north"></div>' +
                '<div id="centerRow" style="height: 100%; overflow: hidden;">' +
                '<div id="west" style="height: 100%; float: left;"></div>' +
                '<div id="east" style="height: 100%; float: right;"></div>' +
                '<div id="center" style="height: 100%;"></div>' +
                '</div>' +
                '<div id="south"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
                '</div>';
        }
        this.layoutActive = true;
    } else {
        template =
            '<div style="position: relative;">' +
                '<div id="north"></div>' +
                '<div id="centerRow">' +
                    '<div id="west"></div>' +
                    '<div id="east"></div>' +
                    '<div id="center"></div>' +
                '</div>' +
                '<div id="south"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
            '</div>';
        this.layoutActive = false;
    }

    this.eGui = utils.loadTemplate(template);

    this.id = 'borderLayout';
    if (params.name) {
        this.id += '_' + params.name;
    }
    this.eGui.setAttribute('id', this.id);
    this.childPanels = [];

    if (params) {
        this.setupPanels(params);
    }

    this.setOverlayVisible(false);
}

BorderLayout.prototype.setupPanels = function(params) {
    this.eNorthWrapper = this.eGui.querySelector('#north');
    this.eSouthWrapper = this.eGui.querySelector('#south');
    this.eEastWrapper = this.eGui.querySelector('#east');
    this.eWestWrapper = this.eGui.querySelector('#west');
    this.eCenterWrapper = this.eGui.querySelector('#center');
    this.eOverlayWrapper = this.eGui.querySelector('#overlay');
    this.eCenterRow = this.eGui.querySelector('#centerRow');

    this.eNorthChildLayout = this.setupPanel(params.north, this.eNorthWrapper);
    this.eSouthChildLayout = this.setupPanel(params.south, this.eSouthWrapper);
    this.eEastChildLayout = this.setupPanel(params.east, this.eEastWrapper);
    this.eWestChildLayout = this.setupPanel(params.west, this.eWestWrapper);
    this.eCenterChildLayout = this.setupPanel(params.center, this.eCenterWrapper);

    this.setupPanel(params.overlay, this.eOverlayWrapper);
};

BorderLayout.prototype.setupPanel = function(content, ePanel) {
    if (!ePanel) {
        return;
    }
    if (content) {
        if (content.isLayoutPanel) {
            this.childPanels.push(content);
            ePanel.appendChild(content.getGui());
            return content;
        } else {
            ePanel.appendChild(content);
            return null;
        }
    } else {
        ePanel.parentNode.removeChild(ePanel);
        return null;
    }
};

BorderLayout.prototype.getGui = function() {
    return this.eGui;
};

BorderLayout.prototype.doLayout = function() {

    this.layoutChild(this.eNorthChildLayout);
    this.layoutChild(this.eSouthChildLayout);
    this.layoutChild(this.eEastChildLayout);
    this.layoutChild(this.eWestChildLayout);

    if (this.layoutActive) {
        this.layoutHeight();
        this.layoutWidth();
    }

    this.layoutChild(this.eCenterChildLayout);
};

BorderLayout.prototype.layoutChild = function(childPanel) {
    if (childPanel) {
        childPanel.doLayout();
    }
};

BorderLayout.prototype.layoutHeight = function() {
    if (this.fullHeight) {
        return;
    }

    var totalHeight = utils.offsetHeight(this.eGui);
    var northHeight = utils.offsetHeight(this.eNorthWrapper);
    var southHeight = utils.offsetHeight(this.eSouthWrapper);

    var centerHeight = totalHeight - northHeight - southHeight;
    if (centerHeight < 0) {
        centerHeight = 0;
    }

    this.eCenterRow.style.height = centerHeight + 'px';
};

BorderLayout.prototype.layoutWidth = function() {
    var totalWidth = utils.offsetWidth(this.eGui);
    var eastWidth = utils.offsetWidth(this.eEastWrapper);
    var westWidth = utils.offsetWidth(this.eWestWrapper);

    var centerWidth = totalWidth - eastWidth - westWidth;
    if (centerWidth < 0) {
        centerWidth = 0;
    }

    this.eCenterWrapper.style.width = centerWidth + 'px';
};

BorderLayout.prototype.setEastVisible = function(visible) {
    if (this.eEastWrapper) {
        this.eEastWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

BorderLayout.prototype.setOverlayVisible = function(visible) {
    if (this.eOverlayWrapper) {
        this.eOverlayWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

BorderLayout.prototype.setSouthVisible = function(visible) {
    if (this.eSouthWrapper) {
        this.eSouthWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

module.exports = BorderLayout;
},{"../utils":39}],25:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"../utils":39,"dup":24}],26:[function(require,module,exports){
var utils = require('../utils');

function VerticalStack() {

    this.isLayoutPanel = true;
    this.childPanels = [];
    this.eGui = document.createElement('div');
    this.eGui.style.height = '100%';
}

VerticalStack.prototype.addPanel = function(panel, height) {
    var component;
    if (panel.isLayoutPanel) {
        this.childPanels.push(panel);
        component = panel.getGui();
    } else {
        component = panel;
    }

    if (height) {
        component.style.height = height;
    }
    this.eGui.appendChild(component);
};

VerticalStack.prototype.getGui = function() {
    return this.eGui;
};

VerticalStack.prototype.doLayout = function() {
    for (var i = 0; i<this.childPanels.length; i++) {
        this.childPanels[i].doLayout();
    }
};

module.exports = VerticalStack;
},{"../utils":39}],27:[function(require,module,exports){
var groupCreator = require('./../groupCreator');
var expandCreator = require('./../expandCreator');
var utils = require('./../utils');
var constants = require('./../constants');

function InMemoryRowController() {
    this.createModel();
}

InMemoryRowController.prototype.init = function(gridOptionsWrapper, columnModel, angularGrid, filterManager, $scope, expressionService) {
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
};

// private
InMemoryRowController.prototype.createModel = function() {
    var that = this;
    this.model = {
        // this method is implemented by the inMemory model only,
        // it gives the top level of the selection. used by the selection
        // controller, when it needs to do a full traversal
        getTopLevelNodes: function() {
            return that.rowsAfterGroup;
        },
        getVirtualRow: function(index) {
            return that.rowsAfterMap[index];
        },
        getVirtualRowCount: function() {
            if (that.rowsAfterMap) {
                return that.rowsAfterMap.length;
            } else {
                return 0;
            }
        },
        forEachInMemory: function(callback) {
            that.forEachInMemory(callback);
        }
    };
};

// public
InMemoryRowController.prototype.getModel = function() {
    return this.model;
};

// public
InMemoryRowController.prototype.forEachInMemory = function(callback) {

    // iterates through each item in memory, and calls the callback function
    function doCallback(list, callback) {
        if (list) {
            for (var i = 0; i<list.length; i++) {
                var item = list[i];
                callback(item);
                if (item.group && group.children) {
                    doCallback(group.children);
                }
            }
        }
    }

    doCallback(this.rowsAfterGroup, callback);
};

// public
InMemoryRowController.prototype.updateModel = function(step) {

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
            setTimeout(function() {
                $scope.$apply();
            }, 0);
        }
    }

};

// private
InMemoryRowController.prototype.defaultGroupAggFunctionFactory = function(groupAggFields) {
    return function groupAggFunction(rows) {

        var sums = {};

        for (var j = 0; j<groupAggFields.length; j++) {
            var colKey = groupAggFields[j];
            var totalForColumn = null;
            for (var i = 0; i<rows.length; i++) {
                var row = rows[i];
                var thisColumnValue = row.data[colKey];
                // only include if the value is a number
                if (typeof thisColumnValue === 'number') {
                    totalForColumn += thisColumnValue;
                }
            }
            // at this point, if no values were numbers, the result is null (not zero)
            sums[colKey] = totalForColumn;
        }

        return sums;

    };
};

// private
InMemoryRowController.prototype.getValue = function(data, colDef, node, rowIndex) {
    var api = this.gridOptionsWrapper.getApi();
    var context = this.gridOptionsWrapper.getContext();
    return utils.getValue(this.expressionService, data, colDef, node, rowIndex, api, context);
};

// public - it's possible to recompute the aggregate without doing the other parts
InMemoryRowController.prototype.doAggregate = function() {

    var groupAggFunction = this.gridOptionsWrapper.getGroupAggFunction();
    if (typeof groupAggFunction === 'function') {
        this.recursivelyCreateAggData(this.rowsAfterFilter, groupAggFunction);
        return;
    }

    var groupAggFields = this.gridOptionsWrapper.getGroupAggFields();
    if (groupAggFields) {
        var defaultAggFunction = this.defaultGroupAggFunctionFactory(groupAggFields);
        this.recursivelyCreateAggData(this.rowsAfterFilter, defaultAggFunction);
        return;
    }

};

// public
InMemoryRowController.prototype.expandOrCollapseAll = function(expand, rowNodes) {
    // if first call in recursion, we set list to parent list
    if (rowNodes === null) {
        rowNodes = this.rowsAfterGroup;
    }

    if (!rowNodes) {
        return;
    }

    var _this = this;
    rowNodes.forEach(function(node) {
        if (node.group) {
            node.expanded = expand;
            _this.expandOrCollapseAll(expand, node.children);
        }
    });
};

// private
InMemoryRowController.prototype.recursivelyCreateAggData = function(nodes, groupAggFunction) {
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
};

// private
InMemoryRowController.prototype.doSort = function() {
    var sorting;

    // if the sorting is already done by the server, then we should not do it here
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sorting = false;
    } else {
        //see if there is a col we are sorting by
        var sortingOptions = [];
        this.columnModel.getAllColumns().forEach(function(column) {
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
        sortingOptions.sort(function(optionA, optionB){
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
};

// private
InMemoryRowController.prototype.recursivelyResetSort = function(rowNodes) {
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
};

// private
InMemoryRowController.prototype.sortList = function(nodes, sortOptions) {

    // sort any groups recursively
    for (var i = 0, l = nodes.length; i < l; i++) { // critical section, no functional programming
        var node = nodes[i];
        if (node.group && node.children) {
            node.childrenAfterSort = node.childrenAfterFilter.slice(0);
            this.sortList(node.childrenAfterSort, sortOptions);
        }
    }

    var that = this;
    function compare(objA, objB, colDef){
        var valueA = that.getValue(objA.data, colDef, objA);
        var valueB = that.getValue(objB.data, colDef, objB);
        if (colDef.comparator) {
            //if comparator provided, use it
            return colDef.comparator(valueA, valueB, objA, objB);
        } else {
            //otherwise do our own comparison
            return utils.defaultComparator(valueA, valueB, objA, objB);
        }
    }

    nodes.sort(function(objA, objB) {
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
};

// private
InMemoryRowController.prototype.doGrouping = function() {
    var rowsAfterGroup;
    var groupedCols = this.columnModel.getGroupedColumns();
    var rowsAlreadyGrouped = this.gridOptionsWrapper.isRowsAlreadyGrouped();

    var doingGrouping = !rowsAlreadyGrouped && groupedCols.length > 0;

    if (doingGrouping) {
        var expandByDefault = this.gridOptionsWrapper.getGroupDefaultExpanded();
        rowsAfterGroup = groupCreator.group(this.allRows, groupedCols,
            this.gridOptionsWrapper.getGroupAggFunction(), expandByDefault);
    } else {
        rowsAfterGroup = this.allRows;
    }
    this.rowsAfterGroup = rowsAfterGroup;
};

// private
InMemoryRowController.prototype.doExpanding = function() {
    var rowsAfterGroup;
    if (this.gridOptionsWrapper.isDoInternalExpanding()) {
        rowsAfterGroup = expandCreator.group(this.allRows);
    } else {
        rowsAfterGroup = this.allRows;
    }
    this.rowsAfterGroup = rowsAfterGroup;
};
// private
InMemoryRowController.prototype.doFilter = function() {
    var doingFilter;

    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        doingFilter = false;
    } else {
        var quickFilterPresent = this.angularGrid.getQuickFilter() !== null;
        var advancedFilterPresent = this.filterManager.isFilterPresent();
        doingFilter = quickFilterPresent || advancedFilterPresent;
    }

    var rowsAfterFilter;
    if (doingFilter) {
        rowsAfterFilter = this.filterItems(this.rowsAfterGroup, quickFilterPresent, advancedFilterPresent);
    } else {
        // do it here
        rowsAfterFilter = this.rowsAfterGroup;
        this.recursivelyResetFilter(this.rowsAfterGroup);
    }
    this.rowsAfterFilter = rowsAfterFilter;
};

// private
InMemoryRowController.prototype.filterItems = function(rowNodes, quickFilterPresent, advancedFilterPresent) {
    var result = [];

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
};

// private
InMemoryRowController.prototype.recursivelyResetFilter = function(nodes) {
    if (!nodes) {
        return;
    }
    for (var i = 0, l = nodes.length; i < l; i++) {
        var node = nodes[i];
        if (node.group && node.children) {
            node.childrenAfterFilter = node.children;
            node.allChildrenCount = this.getTotalChildCount(node.childrenAfterFilter);
            this.recursivelyResetFilter(node.children);
        }
    }
};

// private
// rows: the rows to put into the model
// firstId: the first id to use, used for paging, where we are not on the first page
InMemoryRowController.prototype.setAllRows = function(rows, firstId) {
    var nodes;
    if (this.gridOptionsWrapper.isRowsAlreadyGrouped()) {
        nodes = rows;
        this.recursivelyCheckUserProvidedNodes(nodes, null, 0);
    } else {
        // place each row into a wrapper
        var nodes = [];
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
};

// add in index - this is used by the selectionController - so quick
// to look up selected rows
InMemoryRowController.prototype.recursivelyAddIdToNodes = function(nodes, index) {
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
};

// add in index - this is used by the selectionController - so quick
// to look up selected rows
InMemoryRowController.prototype.recursivelyCheckUserProvidedNodes = function(nodes, parent, level) {
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
};

// private
InMemoryRowController.prototype.getTotalChildCount = function(rowNodes) {
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
};

// private
InMemoryRowController.prototype.copyGroupNode = function(groupNode, children, allChildrenCount) {
    return {
        group: true,
        data: groupNode.data,
        field: groupNode.field,
        key: groupNode.key,
        expanded: groupNode.expanded,
        children: children,
        allChildrenCount: allChildrenCount,
        level: groupNode.level
    };
};

// private
InMemoryRowController.prototype.doGroupMapping = function() {
    // even if not going grouping, we do the mapping, as the client might
    // of passed in data that already has a grouping in it somewhere
    var rowsAfterMap = [];
    this.addToMap(rowsAfterMap, this.rowsAfterSort);
    this.rowsAfterMap = rowsAfterMap;
};

// private
InMemoryRowController.prototype.addToMap = function(mappedData, originalNodes) {
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
};

// private
InMemoryRowController.prototype.createFooterNode = function(groupNode) {
    var footerNode = {};
    Object.keys(groupNode).forEach(function(key) {
        footerNode[key] = groupNode[key];
    });
    footerNode.footer = true;
    // get both header and footer to reference each other as siblings. this is never undone,
    // only overwritten. so if a group is expanded, then contracted, it will have a ghost
    // sibling - but that's fine, as we can ignore this if the header is contracted.
    footerNode.sibling = groupNode;
    groupNode.sibling = footerNode;
    return footerNode;
};

// private
InMemoryRowController.prototype.doesRowPassFilter = function(node, quickFilterPresent, advancedFilterPresent) {
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
};

// private
InMemoryRowController.prototype.aggregateRowForQuickFilter = function(node) {
    var aggregatedText = '';
    this.columnModel.getAllColumns().forEach(function(colDefWrapper) {
        var data = node.data;
        var value = data ? data[colDefWrapper.colDef.field] : null;
        if (value && value !== '') {
            aggregatedText = aggregatedText + value.toString().toUpperCase() + "_";
        }
    });
    node.quickFilterAggregateText = aggregatedText;
};

module.exports = InMemoryRowController;

},{"./../constants":4,"./../expandCreator":6,"./../groupCreator":22,"./../utils":39}],28:[function(require,module,exports){
var template = require('./paginationPanel.html');
var utils = require('./../utils');

function PaginationController() {}

PaginationController.prototype.init = function(angularGrid, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.setupComponents();
    this.callVersion = 0;
};

PaginationController.prototype.setDatasource = function(datasource) {
    this.datasource = datasource;

    if (!datasource) {
        // only continue if we have a valid datasource to work with
        return;
    }

    this.reset();
};

PaginationController.prototype.reset = function() {
    // copy pageSize, to guard against it changing the the datasource between calls
    if (this.datasource.pageSize && typeof this.datasource.pageSize !== 'number') {
        console.warn('datasource.pageSize should be a number');
    }
    this.pageSize = this.datasource.pageSize;
    // see if we know the total number of pages, or if it's 'to be decided'
    if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
        this.rowCount = this.datasource.rowCount;
        this.foundMaxRow = true;
        this.calculateTotalPages();
    } else {
        this.rowCount = 0;
        this.foundMaxRow = false;
        this.totalPages = null;
    }

    this.currentPage = 0;

    // hide the summary panel until something is loaded
    this.ePageRowSummaryPanel.style.visibility = 'hidden';

    this.setTotalLabels();
    this.loadPage();
};

PaginationController.prototype.setTotalLabels = function() {
    if (this.foundMaxRow) {
        this.lbTotal.innerHTML = this.totalPages.toLocaleString();
        this.lbRecordCount.innerHTML = this.rowCount.toLocaleString();
    } else {
        var moreText = this.gridOptionsWrapper.getLocaleTextFunc()('more', 'more');
        this.lbTotal.innerHTML = moreText;
        this.lbRecordCount.innerHTML = moreText;
    }
};

PaginationController.prototype.calculateTotalPages = function() {
    this.totalPages = Math.floor((this.rowCount - 1) / this.pageSize) + 1;
};

PaginationController.prototype.pageLoaded = function(rows, lastRowIndex) {
    var firstId = this.currentPage * this.pageSize;
    this.angularGrid.setRows(rows, firstId);
    // see if we hit the last row
    if (!this.foundMaxRow && typeof lastRowIndex === 'number' && lastRowIndex >= 0) {
        this.foundMaxRow = true;
        this.rowCount = lastRowIndex;
        this.calculateTotalPages();
        this.setTotalLabels();

        // if overshot pages, go back
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages - 1;
            this.loadPage();
        }
    }
    this.enableOrDisableButtons();
    this.updateRowLabels();
};

PaginationController.prototype.updateRowLabels = function() {
    var startRow;
    var endRow;
    if (this.isZeroPagesToDisplay()) {
        startRow = 0;
        endRow = 0;
    } else {
        startRow = (this.pageSize * this.currentPage) + 1;
        endRow = startRow + this.pageSize - 1;
        if (this.foundMaxRow && endRow > this.rowCount) {
            endRow = this.rowCount;
        }
    }
    this.lbFirstRowOnPage.innerHTML = (startRow).toLocaleString();
    this.lbLastRowOnPage.innerHTML = (endRow).toLocaleString();

    // show the summary panel, when first shown, this is blank
    this.ePageRowSummaryPanel.style.visibility = null;
};

PaginationController.prototype.loadPage = function() {
    this.enableOrDisableButtons();
    var startRow = this.currentPage * this.datasource.pageSize;
    var endRow = (this.currentPage + 1) * this.datasource.pageSize;

    this.lbCurrent.innerHTML = (this.currentPage + 1).toLocaleString();

    this.callVersion++;
    var callVersionCopy = this.callVersion;
    var that = this;
    this.angularGrid.showLoadingPanel(true);

    var sortModel;
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sortModel = this.angularGrid.getSortModel();
    }

    var filterModel;
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        filterModel = this.angularGrid.getFilterModel();
    }

    var params = {
        startRow: startRow,
        endRow: endRow,
        successCallback: successCallback,
        failCallback: failCallback,
        sortModel: sortModel,
        filterModel: filterModel
    };

    // check if old version of datasource used
    var getRowsParams = utils.getFunctionParameters(this.datasource.getRows);
    if (getRowsParams.length > 1) {
        console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
        console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
    }

    this.datasource.getRows(params);

    function successCallback(rows, lastRowIndex) {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        that.pageLoaded(rows, lastRowIndex);
    }

    function failCallback() {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        // set in an empty set of rows, this will at
        // least get rid of the loading panel, and
        // stop blocking things
        that.angularGrid.setRows([]);
    }
};

PaginationController.prototype.isCallDaemon = function(versionCopy) {
    return versionCopy !== this.callVersion;
};

PaginationController.prototype.onBtNext = function() {
    this.currentPage++;
    this.loadPage();
};

PaginationController.prototype.onBtPrevious = function() {
    this.currentPage--;
    this.loadPage();
};

PaginationController.prototype.onBtFirst = function() {
    this.currentPage = 0;
    this.loadPage();
};

PaginationController.prototype.onBtLast = function() {
    this.currentPage = this.totalPages - 1;
    this.loadPage();
};

PaginationController.prototype.isZeroPagesToDisplay = function() {
    return this.foundMaxRow && this.totalPages === 0;
};

PaginationController.prototype.enableOrDisableButtons = function() {
    var disablePreviousAndFirst = this.currentPage === 0;
    this.btPrevious.disabled = disablePreviousAndFirst;
    this.btFirst.disabled = disablePreviousAndFirst;

    var zeroPagesToDisplay = this.isZeroPagesToDisplay();
    var onLastPage = this.foundMaxRow && this.currentPage === (this.totalPages - 1);

    var disableNext = onLastPage || zeroPagesToDisplay;
    this.btNext.disabled = disableNext;

    var disableLast = !this.foundMaxRow || zeroPagesToDisplay || this.currentPage === (this.totalPages - 1);
    this.btLast.disabled = disableLast;
};

PaginationController.prototype.createTemplate = function() {
    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    return template
        .replace('[PAGE]', localeTextFunc('page', 'Page'))
        .replace('[TO]', localeTextFunc('to', 'to'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[FIRST]', localeTextFunc('first', 'First'))
        .replace('[PREVIOUS]', localeTextFunc('previous', 'Previous'))
        .replace('[NEXT]', localeTextFunc('next', 'Next'))
        .replace('[LAST]', localeTextFunc('last', 'Last'));
};

PaginationController.prototype.getGui= function() {
    return this.eGui;
};

PaginationController.prototype.setupComponents = function() {

    this.eGui = utils.loadTemplate(this.createTemplate());

    this.btNext = this.eGui.querySelector('#btNext');
    this.btPrevious = this.eGui.querySelector('#btPrevious');
    this.btFirst = this.eGui.querySelector('#btFirst');
    this.btLast = this.eGui.querySelector('#btLast');
    this.lbCurrent = this.eGui.querySelector('#current');
    this.lbTotal = this.eGui.querySelector('#total');

    this.lbRecordCount = this.eGui.querySelector('#recordCount');
    this.lbFirstRowOnPage = this.eGui.querySelector('#firstRowOnPage');
    this.lbLastRowOnPage = this.eGui.querySelector('#lastRowOnPage');
    this.ePageRowSummaryPanel = this.eGui.querySelector('#pageRowSummaryPanel');

    var that = this;

    this.btNext.addEventListener('click', function() {
        that.onBtNext();
    });

    this.btPrevious.addEventListener('click', function() {
        that.onBtPrevious();
    });

    this.btFirst.addEventListener('click', function() {
        that.onBtFirst();
    });

    this.btLast.addEventListener('click', function() {
        that.onBtLast();
    });
};

module.exports = PaginationController;

},{"./../utils":39,"./paginationPanel.html":29}],29:[function(require,module,exports){
module.exports = "<div class=ag-paging-panel><span id=pageRowSummaryPanel class=ag-paging-row-summary-panel><span id=firstRowOnPage></span> [TO] <span id=lastRowOnPage></span> [OF] <span id=recordCount></span></span> <span class=ag-paging-page-summary-panel><button class=ag-paging-button id=btFirst>[FIRST]</button> <button class=ag-paging-button id=btPrevious>[PREVIOUS]</button> [PAGE] <span id=current></span> [OF] <span id=total></span> <button class=ag-paging-button id=btNext>[NEXT]</button> <button class=ag-paging-button id=btLast>[LAST]</button></span></div>";

},{}],30:[function(require,module,exports){
/*
 * This row controller is used for infinite scrolling only. For normal 'in memory' table,
 * or standard pagination, the inMemoryRowController is used.
 */
var utils = require('./../utils');
var logging = false;

function VirtualPageRowController() {}

VirtualPageRowController.prototype.init = function(rowRenderer, gridOptionsWrapper, angularGrid) {
    this.rowRenderer = rowRenderer;
    this.datasourceVersion = 0;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
};

VirtualPageRowController.prototype.setDatasource = function(datasource) {
    this.datasource = datasource;

    if (!datasource) {
        // only continue if we have a valid datasource to working with
        return;
    }

    this.reset();
};

VirtualPageRowController.prototype.reset = function() {
    // see if datasource knows how many rows there are
    if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
        this.virtualRowCount = this.datasource.rowCount;
        this.foundMaxRow = true;
    } else {
        this.virtualRowCount = 0;
        this.foundMaxRow = false;
    }

    // in case any daemon requests coming from datasource, we know it ignore them
    this.datasourceVersion++;

    // map of page numbers to rows in that page
    this.pageCache = {};
    this.pageCacheSize = 0;

    // if a number is in this array, it means we are pending a load from it
    this.pageLoadsInProgress = [];
    this.pageLoadsQueued = [];
    this.pageAccessTimes = {}; // keeps a record of when each page was last viewed, used for LRU cache
    this.accessTime = 0; // rather than using the clock, we use this counter

    // the number of concurrent loads we are allowed to the server
    if (typeof this.datasource.maxConcurrentRequests === 'number' && this.datasource.maxConcurrentRequests > 0) {
        this.maxConcurrentDatasourceRequests = this.datasource.maxConcurrentRequests;
    } else {
        this.maxConcurrentDatasourceRequests = 2;
    }

    // the number of pages to keep in browser cache
    if (typeof this.datasource.maxPagesInCache === 'number' && this.datasource.maxPagesInCache > 0) {
        this.maxPagesInCache = this.datasource.maxPagesInCache;
    } else {
        // null is default, means don't  have any max size on the cache
        this.maxPagesInCache = null;
    }

    this.pageSize = this.datasource.pageSize; // take a copy of page size, we don't want it changing
    this.overflowSize = this.datasource.overflowSize; // take a copy of page size, we don't want it changing

    this.doLoadOrQueue(0);
};

VirtualPageRowController.prototype.createNodesFromRows = function(pageNumber, rows) {
    var nodes = [];
    if (rows) {
        for (var i = 0, j = rows.length; i < j; i++) {
            var virtualRowIndex = (pageNumber * this.pageSize) + i;
            nodes.push({
                data: rows[i],
                id: virtualRowIndex
            });
        }
    }
    return nodes;
};

VirtualPageRowController.prototype.removeFromLoading = function(pageNumber) {
    var index = this.pageLoadsInProgress.indexOf(pageNumber);
    this.pageLoadsInProgress.splice(index, 1);
};

VirtualPageRowController.prototype.pageLoadFailed = function(pageNumber) {
    this.removeFromLoading(pageNumber);
    this.checkQueueForNextLoad();
};

VirtualPageRowController.prototype.pageLoaded = function(pageNumber, rows, lastRow) {
    this.putPageIntoCacheAndPurge(pageNumber, rows);
    this.checkMaxRowAndInformRowRenderer(pageNumber, lastRow);
    this.removeFromLoading(pageNumber);
    this.checkQueueForNextLoad();
};

VirtualPageRowController.prototype.putPageIntoCacheAndPurge = function(pageNumber, rows) {
    this.pageCache[pageNumber] = this.createNodesFromRows(pageNumber, rows);
    this.pageCacheSize++;
    if (logging) {
        console.log('adding page ' + pageNumber);
    }

    var needToPurge = this.maxPagesInCache && this.maxPagesInCache < this.pageCacheSize;
    if (needToPurge) {
        // find the LRU page
        var youngestPageIndex = this.findLeastRecentlyAccessedPage(Object.keys(this.pageCache));

        if (logging) {
            console.log('purging page ' + youngestPageIndex + ' from cache ' + Object.keys(this.pageCache));
        }
        delete this.pageCache[youngestPageIndex];
        this.pageCacheSize--;
    }

};

VirtualPageRowController.prototype.checkMaxRowAndInformRowRenderer = function(pageNumber, lastRow) {
    if (!this.foundMaxRow) {
        // if we know the last row, use if
        if (typeof lastRow === 'number' && lastRow >= 0) {
            this.virtualRowCount = lastRow;
            this.foundMaxRow = true;
        } else {
            // otherwise, see if we need to add some virtual rows
            var thisPagePlusBuffer = ((pageNumber + 1) * this.pageSize) + this.overflowSize;
            if (this.virtualRowCount < thisPagePlusBuffer) {
                this.virtualRowCount = thisPagePlusBuffer;
            }
        }
        // if rowCount changes, refreshView, otherwise just refreshAllVirtualRows
        this.rowRenderer.refreshView();
    } else {
        this.rowRenderer.refreshAllVirtualRows();
    }
};

VirtualPageRowController.prototype.isPageAlreadyLoading = function(pageNumber) {
    var result = this.pageLoadsInProgress.indexOf(pageNumber) >= 0 || this.pageLoadsQueued.indexOf(pageNumber) >= 0;
    return result;
};

VirtualPageRowController.prototype.doLoadOrQueue = function(pageNumber) {
    // if we already tried to load this page, then ignore the request,
    // otherwise server would be hit 50 times just to display one page, the
    // first row to find the page missing is enough.
    if (this.isPageAlreadyLoading(pageNumber)) {
        return;
    }

    // try the page load - if not already doing a load, then we can go ahead
    if (this.pageLoadsInProgress.length < this.maxConcurrentDatasourceRequests) {
        // go ahead, load the page
        this.loadPage(pageNumber);
    } else {
        // otherwise, queue the request
        this.addToQueueAndPurgeQueue(pageNumber);
    }
};

VirtualPageRowController.prototype.addToQueueAndPurgeQueue = function(pageNumber) {
    if (logging) {
        console.log('queueing ' + pageNumber + ' - ' + this.pageLoadsQueued);
    }
    this.pageLoadsQueued.push(pageNumber);

    // see if there are more pages queued that are actually in our cache, if so there is
    // no point in loading them all as some will be purged as soon as loaded
    var needToPurge = this.maxPagesInCache && this.maxPagesInCache < this.pageLoadsQueued.length;
    if (needToPurge) {
        // find the LRU page
        var youngestPageIndex = this.findLeastRecentlyAccessedPage(this.pageLoadsQueued);

        if (logging) {
            console.log('de-queueing ' + pageNumber + ' - ' + this.pageLoadsQueued);
        }

        var indexToRemove = this.pageLoadsQueued.indexOf(youngestPageIndex);
        this.pageLoadsQueued.splice(indexToRemove, 1);
    }
};

VirtualPageRowController.prototype.findLeastRecentlyAccessedPage = function(pageIndexes) {
    var youngestPageIndex = -1;
    var youngestPageAccessTime = Number.MAX_VALUE;
    var that = this;

    pageIndexes.forEach(function(pageIndex) {
        var accessTimeThisPage = that.pageAccessTimes[pageIndex];
        if (accessTimeThisPage < youngestPageAccessTime) {
            youngestPageAccessTime = accessTimeThisPage;
            youngestPageIndex = pageIndex;
        }
    });

    return youngestPageIndex;
};

VirtualPageRowController.prototype.checkQueueForNextLoad = function() {
    if (this.pageLoadsQueued.length > 0) {
        // take from the front of the queue
        var pageToLoad = this.pageLoadsQueued[0];
        this.pageLoadsQueued.splice(0, 1);

        if (logging) {
            console.log('dequeueing ' + pageToLoad + ' - ' + this.pageLoadsQueued);
        }

        this.loadPage(pageToLoad);
    }
};

VirtualPageRowController.prototype.loadPage = function(pageNumber) {

    this.pageLoadsInProgress.push(pageNumber);

    var startRow = pageNumber * this.pageSize;
    var endRow = (pageNumber + 1) * this.pageSize;

    var that = this;
    var datasourceVersionCopy = this.datasourceVersion;

    var sortModel;
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sortModel = this.angularGrid.getSortModel();
    }

    var filterModel;
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        filterModel = this.angularGrid.getFilterModel();
    }

    var params = {
        startRow: startRow,
        endRow: endRow,
        successCallback: successCallback,
        failCallback: failCallback,
        sortModel: sortModel,
        filterModel: filterModel
    };

    // check if old version of datasource used
    var getRowsParams = utils.getFunctionParameters(this.datasource.getRows);
    if (getRowsParams.length > 1) {
        console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
        console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
    }

    this.datasource.getRows(params);

    function successCallback(rows, lastRowIndex) {
        if (that.requestIsDaemon(datasourceVersionCopy)) {
            return;
        }
        that.pageLoaded(pageNumber, rows, lastRowIndex);
    }

    function failCallback() {
        if (that.requestIsDaemon(datasourceVersionCopy)) {
            return;
        }
        that.pageLoadFailed(pageNumber);
    }
};

// check that the datasource has not changed since the lats time we did a request
VirtualPageRowController.prototype.requestIsDaemon = function(datasourceVersionCopy) {
    return this.datasourceVersion !== datasourceVersionCopy;
};

VirtualPageRowController.prototype.getVirtualRow = function(rowIndex) {
    if (rowIndex > this.virtualRowCount) {
        return null;
    }

    var pageNumber = Math.floor(rowIndex / this.pageSize);
    var page = this.pageCache[pageNumber];

    // for LRU cache, track when this page was last hit
    this.pageAccessTimes[pageNumber] = this.accessTime++;

    if (!page) {
        this.doLoadOrQueue(pageNumber);
        // return back an empty row, so table can at least render empty cells
        return {
            data: {},
            id: rowIndex
        };
    } else {
        var indexInThisPage = rowIndex % this.pageSize;
        return page[indexInThisPage];
    }
};

VirtualPageRowController.prototype.forEachInMemory = function(callback) {
    var pageKeys = Object.keys(this.pageCache);
    for (var i = 0; i<pageKeys.length; i++) {
        var pageKey = pageKeys[i];
        var page = this.pageCache[pageKey];
        for (var j = 0; j<page.length; j++) {
            var node = page[j];
            callback(node);
        }
    }
};

VirtualPageRowController.prototype.getModel = function() {
    var that = this;
    return {
        getVirtualRow: function(index) {
            return that.getVirtualRow(index);
        },
        getVirtualRowCount: function() {
            return that.virtualRowCount;
        },
        forEachInMemory: function( callback ) {
            that.forEachInMemory(callback);
        }
    };
};

module.exports = VirtualPageRowController;

},{"./../utils":39}],31:[function(require,module,exports){
var constants = require('./constants');
var utils = require('./utils');
var groupCellRendererFactory = require('./cellRenderers/groupCellRendererFactory');

function RowRenderer() {}

RowRenderer.prototype.init = function(gridOptions, columnModel, gridOptionsWrapper, gridPanel,
    angularGrid, selectionRendererFactory, $compile, $scope,
    selectionController, expressionService, templateService) {
    this.gridOptions = gridOptions;
    this.columnModel = columnModel;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.selectionRendererFactory = selectionRendererFactory;
    this.gridPanel = gridPanel;
    this.$compile = $compile;
    this.$scope = $scope;
    this.selectionController = selectionController;
    this.expressionService = expressionService;
    this.templateService = templateService;
    this.findAllElements(gridPanel);

    this.cellRendererMap = {
        'group': groupCellRendererFactory(gridOptionsWrapper, selectionRendererFactory),
        'expand': gridOptions.expandRow
    };

    // map of row ids to row objects. keeps track of which elements
    // are rendered for which rows in the dom. each row object has:
    // [scope, bodyRow, pinnedRow, rowData]
    this.renderedRows = {};

    this.renderedRowStartEditingListeners = {};

    this.editingCell = false; //gets set to true when editing a cell
};

RowRenderer.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

RowRenderer.prototype.setMainRowWidths = function() {
    var mainRowWidth = this.columnModel.getBodyContainerWidth() + "px";

    var unpinnedRows = this.eBodyContainer.querySelectorAll(".ag-row");
    for (var i = 0; i < unpinnedRows.length; i++) {
        unpinnedRows[i].style.width = mainRowWidth;
    }
};

RowRenderer.prototype.findAllElements = function(gridPanel) {
    this.eBodyContainer = gridPanel.getBodyContainer();
    this.eBodyViewport = gridPanel.getBodyViewport();
    this.ePinnedColsContainer = gridPanel.getPinnedColsContainer();
    this.eParentOfRows = gridPanel.getRowsParent();
};

RowRenderer.prototype.refreshView = function(refreshFromIndex) {
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        var rowCount = this.rowModel.getVirtualRowCount();
        var containerHeight = this.gridOptionsWrapper.getRowHeight() * rowCount;
        this.eBodyContainer.style.height = containerHeight + "px";
        this.ePinnedColsContainer.style.height = containerHeight + "px";
    }

    this.refreshAllVirtualRows(refreshFromIndex);
};

RowRenderer.prototype.softRefreshView = function() {

    var first = this.firstVirtualRenderedRow;
    var last = this.lastVirtualRenderedRow;

    var columns = this.columnModel.getDisplayedColumns();
    // if no cols, don't draw row
    if (!columns || columns.length === 0) {
        return;
    }

    for (var rowIndex = first; rowIndex <= last; rowIndex++) {
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node) {

            for (var colIndex = 0; colIndex < columns.length; colIndex++) {
                var column = columns[colIndex];
                var renderedRow = this.renderedRows[rowIndex];
                var eGridCell = renderedRow.eVolatileCells[column.colId];

                if (!eGridCell) {
                    continue;
                }

                var isFirstColumn = colIndex === 0;
                var scope = renderedRow.scope;

                this.softRefreshCell(eGridCell, isFirstColumn, node, column, scope, rowIndex);
            }
        }
    }
};

RowRenderer.prototype.softRefreshCell = function(eGridCell, isFirstColumn, node, column, scope, rowIndex) {

    utils.removeAllChildren(eGridCell);

    var data = this.getDataForNode(node);
    var valueGetter = this.createValueGetter(data, column.colDef, node);

    var value;
    if (valueGetter) {
        value = valueGetter();
    }

    this.populateAndStyleGridCell(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, scope);

    // if angular compiling, then need to also compile the cell again (angular compiling sucks, please wait...)
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        this.$compile(eGridCell)(scope);
    }
};

RowRenderer.prototype.rowDataChanged = function(rows) {
    // we only need to be worried about rendered rows, as this method is
    // called to whats rendered. if the row isn't rendered, we don't care
    var indexesToRemove = [];
    var renderedRows = this.renderedRows;
    Object.keys(renderedRows).forEach(function(key) {
        var renderedRow = renderedRows[key];
        // see if the rendered row is in the list of rows we have to update
        var rowNeedsUpdating = rows.indexOf(renderedRow.node.data) >= 0;
        if (rowNeedsUpdating) {
            indexesToRemove.push(key);
        }
    });
    // remove the rows
    this.removeVirtualRows(indexesToRemove);
    // add draw them again
    this.drawVirtualRows();
};

RowRenderer.prototype.refreshAllVirtualRows = function(fromIndex) {
    // remove all current virtual rows, as they have old data
    var rowsToRemove = Object.keys(this.renderedRows);
    this.removeVirtualRows(rowsToRemove, fromIndex);

    // add in new rows
    this.drawVirtualRows();
};

// public - removes the group rows and then redraws them again
RowRenderer.prototype.refreshGroupRows = function() {
    // find all the group rows
    var rowsToRemove = [];
    var that = this;
    Object.keys(this.renderedRows).forEach(function(key) {
        var renderedRow = that.renderedRows[key];
        var node = renderedRow.node;
        if (node.group) {
            rowsToRemove.push(key);
        }
    });
    // remove the rows
    this.removeVirtualRows(rowsToRemove);
    // and draw them back again
    this.ensureRowsRendered();
};

// takes array of row indexes
RowRenderer.prototype.removeVirtualRows = function(rowsToRemove, fromIndex) {
    var that = this;
    // if no fromIndex then set to -1, which will refresh everything
    var realFromIndex = (typeof fromIndex === 'number') ? fromIndex : -1;
    rowsToRemove.forEach(function(indexToRemove) {
        if (indexToRemove >= realFromIndex) {
            that.removeVirtualRow(indexToRemove);

            // if the row was last to have focus, we remove the fact that it has focus
            if (that.focusedCell && that.focusedCell.rowIndex == indexToRemove) {
                that.focusedCell = null;
            }
        }
    });
};

RowRenderer.prototype.removeVirtualRow = function(indexToRemove) {
    var renderedRow = this.renderedRows[indexToRemove];
    if (renderedRow.pinnedElement && this.ePinnedColsContainer) {
        this.ePinnedColsContainer.removeChild(renderedRow.pinnedElement);
    }

    if (renderedRow.bodyElement) {
        this.eBodyContainer.removeChild(renderedRow.bodyElement);
    }

    if (renderedRow.scope) {
        renderedRow.scope.$destroy();
    }

    if (this.gridOptionsWrapper.getVirtualRowRemoved()) {
        this.gridOptionsWrapper.getVirtualRowRemoved()(renderedRow.data, indexToRemove);
    }
    this.angularGrid.onVirtualRowRemoved(indexToRemove);

    delete this.renderedRows[indexToRemove];
    delete this.renderedRowStartEditingListeners[indexToRemove];
};

RowRenderer.prototype.drawVirtualRows = function() {
    var first;
    var last;

    var rowCount = this.rowModel.getVirtualRowCount();

    if (this.gridOptionsWrapper.isDontUseScrolls()) {
        first = 0;
        last = rowCount;
    } else {
        var topPixel = this.eBodyViewport.scrollTop;
        var bottomPixel = topPixel + this.eBodyViewport.offsetHeight;

        first = Math.floor(topPixel / this.gridOptionsWrapper.getRowHeight());
        last = Math.floor(bottomPixel / this.gridOptionsWrapper.getRowHeight());

        //add in buffer
        var buffer = this.gridOptionsWrapper.getRowBuffer() || constants.ROW_BUFFER_SIZE;
        first = first - buffer;
        last = last + buffer;

        // adjust, in case buffer extended actual size
        if (first < 0) {
            first = 0;
        }
        if (last > rowCount - 1) {
            last = rowCount - 1;
        }
    }

    this.firstVirtualRenderedRow = first;
    this.lastVirtualRenderedRow = last;

    this.ensureRowsRendered();
};

RowRenderer.prototype.getFirstVirtualRenderedRow = function() {
    return this.firstVirtualRenderedRow;
};

RowRenderer.prototype.getLastVirtualRenderedRow = function() {
    return this.lastVirtualRenderedRow;
};

RowRenderer.prototype.ensureRowsRendered = function() {

    var mainRowWidth = this.columnModel.getBodyContainerWidth();
    var that = this;

    // at the end, this array will contain the items we need to remove
    var rowsToRemove = Object.keys(this.renderedRows);

    // add in new rows
    for (var rowIndex = this.firstVirtualRenderedRow; rowIndex <= this.lastVirtualRenderedRow; rowIndex++) {
        // see if item already there, and if yes, take it out of the 'to remove' array
        if (rowsToRemove.indexOf(rowIndex.toString()) >= 0) {
            rowsToRemove.splice(rowsToRemove.indexOf(rowIndex.toString()), 1);
            continue;
        }
        // check this row actually exists (in case overflow buffer window exceeds real data)
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node) {
            that.insertRow(node, rowIndex, mainRowWidth);
        }
    }

    // at this point, everything in our 'rowsToRemove' . . .
    this.removeVirtualRows(rowsToRemove);

    // if we are doing angular compiling, then do digest the scope here
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        // we do it in a timeout, in case we are already in an apply
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

RowRenderer.prototype.insertRow = function(node, rowIndex, mainRowWidth) {
    var columns = this.columnModel.getDisplayedColumns();
    // if no cols, don't draw row
    if (!columns || columns.length == 0) {
        return;
    }

    // var rowData = node.rowData;
    var rowIsAGroup = node.group;

    // try compiling as we insert rows
    var newChildScope = this.createChildScopeOrNull(node.data);

    var ePinnedRow = this.createRowContainer(rowIndex, node, rowIsAGroup, newChildScope);
    var eMainRow = this.createRowContainer(rowIndex, node, rowIsAGroup, newChildScope);
    var that = this;

    eMainRow.style.width = mainRowWidth + "px";

    var renderedRow = {
        scope: newChildScope,
        node: node,
        rowIndex: rowIndex,
        eCells: {},
        eVolatileCells: {}
    };
    this.renderedRows[rowIndex] = renderedRow;
    this.renderedRowStartEditingListeners[rowIndex] = {};

    // if group item, insert the first row
    var groupHeaderTakesEntireRow = this.gridOptionsWrapper.isGroupUseEntireRow();
    var drawGroupRow = rowIsAGroup && groupHeaderTakesEntireRow;

    if (drawGroupRow) {
        var firstColumn = columns[0];

        var eGroupRow = that.createGroupElement(node, rowIndex, false);
        if (firstColumn.pinned) {
            ePinnedRow.appendChild(eGroupRow);

            var eGroupRowPadding = that.createGroupElement(node, rowIndex, true);
            eMainRow.appendChild(eGroupRowPadding);
        } else {
            eMainRow.appendChild(eGroupRow);
        }

    } else {
        if (this.gridOptionsWrapper.isDoInternalExpanding()) {
            if (node.first) {
                var params = {
                    node: node.parent,
                    data: node.parent.data,
                    rowIndex: rowIndex,
                    api: this.gridOptionsWrapper.getApi()
                };
                var eGroupRow = that.cellRendererMap['expand'](params);
                eMainRow.style.height = (20 * node.parent.rows) + 'px';
                eMainRow.appendChild(eGroupRow);
            }
            if (node.group)
            {
                columns.forEach(function(column, index) {
                    var firstCol = index === 0;
                    var data = that.getDataForNode(node);
                    var valueGetter = that.createValueGetter(data, column.colDef, node);
                    that.createCellFromColDef(firstCol, column, valueGetter, node, rowIndex, eMainRow, ePinnedRow, newChildScope, renderedRow);
                });
            }
        } else {
            columns.forEach(function(column, index) {
                var firstCol = index === 0;
                var data = that.getDataForNode(node);
                var valueGetter = that.createValueGetter(data, column.colDef, node);
                that.createCellFromColDef(firstCol, column, valueGetter, node, rowIndex, eMainRow, ePinnedRow, newChildScope, renderedRow);
            });
        }
    }

    //try compiling as we insert rows
    renderedRow.pinnedElement = this.compileAndAdd(this.ePinnedColsContainer, rowIndex, ePinnedRow, newChildScope);
    renderedRow.bodyElement = this.compileAndAdd(this.eBodyContainer, rowIndex, eMainRow, newChildScope);
};

// if group is a footer, always show the data.
// if group is a header, only show data if not expanded
RowRenderer.prototype.getDataForNode = function(node) {
    if (node.footer) {
        // if footer, we always show the data
        return node.data;
    } else if (node.group) {
        // if header and header is expanded, we show data in footer only
        var footersEnabled = this.gridOptionsWrapper.isGroupIncludeFooter();
        return (node.expanded && footersEnabled) ? undefined : node.data;
    } else {
        // otherwise it's a normal node, just return data as normal
        return node.data;
    }
};

RowRenderer.prototype.createValueGetter = function(data, colDef, node) {
    var that = this;
    return function() {
        var api = that.gridOptionsWrapper.getApi();
        var context = that.gridOptionsWrapper.getContext();
        return utils.getValue(that.expressionService, data, colDef, node, api, context);
    };
};

RowRenderer.prototype.createChildScopeOrNull = function(data) {
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        var newChildScope = this.$scope.$new();
        newChildScope.data = data;
        return newChildScope;
    } else {
        return null;
    }
};

RowRenderer.prototype.compileAndAdd = function(container, rowIndex, element, scope) {
    if (scope) {
        var eElementCompiled = this.$compile(element)(scope);
        if (container) { // checking container, as if noScroll, pinned container is missing
            container.appendChild(eElementCompiled[0]);
        }
        return eElementCompiled[0];
    } else {
        if (container) {
            container.appendChild(element);
        }
        return element;
    }
};

RowRenderer.prototype.createCellFromColDef = function(isFirstColumn, column, valueGetter, node, rowIndex, eMainRow, ePinnedRow, $childScope, renderedRow) {
    var eGridCell = this.createCell(isFirstColumn, column, valueGetter, node, rowIndex, $childScope);

    if (column.colDef.volatile) {
        renderedRow.eVolatileCells[column.colId] = eGridCell;
    }
    renderedRow.eCells[column.colId] = eGridCell;

    if (column.pinned) {
        ePinnedRow.appendChild(eGridCell);
    } else {
        eMainRow.appendChild(eGridCell);
    }
};

RowRenderer.prototype.addClassesToRow = function(rowIndex, node, eRow) {
    var classesList = ["ag-row"];
    classesList.push(rowIndex % 2 == 0 ? "ag-row-even" : "ag-row-odd");

    if (this.selectionController.isNodeSelected(node)) {
        classesList.push("ag-row-selected");
    }
    if (node.group) {
        // if a group, put the level of the group in
        classesList.push("ag-row-level-" + node.level);
    } else {
        // if a leaf, and a parent exists, put a level of the parent, else put level of 0 for top level item
        if (node.parent) {
            classesList.push("ag-row-level-" + (node.parent.level + 1));
        } else {
            classesList.push("ag-row-level-0");
        }
    }
    if (node.group) {
        classesList.push("ag-row-group");
    }
    if (node.group && !node.footer && node.expanded) {
        classesList.push("ag-row-group-expanded");
    }
    if (node.group && !node.footer && !node.expanded) {
        // opposite of expanded is contracted according to the internet.
        classesList.push("ag-row-group-contracted");
    }
    if (node.group && node.footer) {
        classesList.push("ag-row-footer");
    }

    // add in extra classes provided by the config
    if (this.gridOptionsWrapper.getRowClass()) {
        var params = {
            node: node,
            data: node.data,
            rowIndex: rowIndex,
            context: this.gridOptionsWrapper.getContext(),
            api: this.gridOptionsWrapper.getApi()
        };
        var extraRowClasses = this.gridOptionsWrapper.getRowClass()(params);
        if (extraRowClasses) {
            if (typeof extraRowClasses === 'string') {
                classesList.push(extraRowClasses);
            } else if (Array.isArray(extraRowClasses)) {
                extraRowClasses.forEach(function(classItem) {
                    classesList.push(classItem);
                });
            }
        }
    }

    var classes = classesList.join(" ");

    eRow.className = classes;
};

RowRenderer.prototype.createRowContainer = function(rowIndex, node, groupRow, $scope) {
    var eRow = document.createElement("div");

    this.addClassesToRow(rowIndex, node, eRow);

    eRow.setAttribute('row', rowIndex);

    // if showing scrolls, position on the container
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        eRow.style.top = (this.gridOptionsWrapper.getRowHeight() * rowIndex) + "px";
    }
    eRow.style.height = (this.gridOptionsWrapper.getRowHeight()) + "px";

    if (this.gridOptionsWrapper.getRowStyle()) {
        var cssToUse;
        var rowStyle = this.gridOptionsWrapper.getRowStyle();
        if (typeof rowStyle === 'function') {
            var params = {
                data: node.data,
                node: node,
                api: this.gridOptionsWrapper.getApi(),
                context: this.gridOptionsWrapper.getContext(),
                $scope: $scope
            };
            cssToUse = rowStyle(params);
        } else {
            cssToUse = rowStyle;
        }

        if (cssToUse) {
            Object.keys(cssToUse).forEach(function(key) {
                eRow.style[key] = cssToUse[key];
            });
        }
    }

    var _this = this;
    eRow.addEventListener("click", function(event) {
        _this.angularGrid.onRowClicked(event, Number(this.getAttribute("row")), node)
    });

    return eRow;
};

RowRenderer.prototype.getIndexOfRenderedNode = function(node) {
    var renderedRows = this.renderedRows;
    var keys = Object.keys(renderedRows);
    for (var i = 0; i < keys.length; i++) {
        if (renderedRows[keys[i]].node === node) {
            return renderedRows[keys[i]].rowIndex;
        }
    }
    return -1;
};

RowRenderer.prototype.createGroupElement = function(node, rowIndex, padding) {
    var eRow;
    // padding means we are on the right hand side of a pinned table, ie
    // in the main body.
    if (padding) {
        eRow = document.createElement('span');
    } else {
        var params = {
            node: node,
            data: node.data,
            rowIndex: rowIndex,
            api: this.gridOptionsWrapper.getApi(),
            colDef: {
                cellRenderer: {
                    renderer: 'group',
                    innerRenderer: this.gridOptionsWrapper.getGroupRowInnerRenderer()
                }
            }
        };
        eRow = this.cellRendererMap['group'](params);
    }

    if (node.footer) {
        utils.addCssClass(eRow, 'ag-footer-cell-entire-row');
    } else {
        utils.addCssClass(eRow, 'ag-group-cell-entire-row');
    }

    return eRow;
};

RowRenderer.prototype.putDataIntoCell = function(column, value, valueGetter, node, $childScope, eSpanWithValue, eGridCell, rowIndex, refreshCellFunction) {
    // template gets preference, then cellRenderer, then do it ourselves
    var colDef = column.colDef;
    if (colDef.template) {
        eSpanWithValue.innerHTML = colDef.template;
    } else if (colDef.templateUrl) {
        var template = this.templateService.getTemplate(colDef.templateUrl, refreshCellFunction);
        if (template) {
            eSpanWithValue.innerHTML = template;
        }
    } else if (colDef.cellRenderer) {
        this.useCellRenderer(column, value, node, $childScope, eSpanWithValue, rowIndex, refreshCellFunction, valueGetter, eGridCell);
    } else {
        // if we insert undefined, then it displays as the string 'undefined', ugly!
        if (value !== undefined && value !== null && value !== '') {
            eSpanWithValue.innerHTML = value;
        }
    }
};

RowRenderer.prototype.useCellRenderer = function(column, value, node, $childScope, eSpanWithValue, rowIndex, refreshCellFunction, valueGetter, eGridCell) {
    var colDef = column.colDef;
    var rendererParams = {
        value: value,
        valueGetter: valueGetter,
        data: node.data,
        node: node,
        colDef: colDef,
        column: column,
        $scope: $childScope,
        rowIndex: rowIndex,
        api: this.gridOptionsWrapper.getApi(),
        context: this.gridOptionsWrapper.getContext(),
        refreshCell: refreshCellFunction,
        eGridCell: eGridCell
    };
    var cellRenderer;
    if (typeof colDef.cellRenderer === 'object' && colDef.cellRenderer !== null) {
        cellRenderer = this.cellRendererMap[colDef.cellRenderer.renderer];
        if (!cellRenderer) {
            throw 'Cell renderer ' + colDef.cellRenderer + ' not found, available are ' + Object.keys(this.cellRendererMap);
        }
    } else if (typeof colDef.cellRenderer === 'function') {
        cellRenderer = colDef.cellRenderer;
    } else {
        throw 'Cell Renderer must be String or Function';
    }
    var resultFromRenderer = cellRenderer(rendererParams);
    if (utils.isNodeOrElement(resultFromRenderer)) {
        // a dom node or element was returned, so add child
        eSpanWithValue.appendChild(resultFromRenderer);
    } else {
        // otherwise assume it was html, so just insert
        eSpanWithValue.innerHTML = resultFromRenderer;
    }
};

RowRenderer.prototype.addStylesFromCollDef = function(column, value, node, $childScope, eGridCell) {
    var colDef = column.colDef;
    if (colDef.cellStyle) {
        var cssToUse;
        if (typeof colDef.cellStyle === 'function') {
            var cellStyleParams = {
                value: value,
                data: node.data,
                node: node,
                colDef: colDef,
                column: column,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            cssToUse = colDef.cellStyle(cellStyleParams);
        } else {
            cssToUse = colDef.cellStyle;
        }

        if (cssToUse) {
            Object.keys(cssToUse).forEach(function(key) {
                eGridCell.style[key] = cssToUse[key];
            });
        }
    }
};

RowRenderer.prototype.addClassesFromCollDef = function(colDef, value, node, $childScope, eGridCell) {
    if (colDef.cellClass) {
        var classToUse;
        if (typeof colDef.cellClass === 'function') {
            var cellClassParams = {
                value: value,
                data: node.data,
                node: node,
                colDef: colDef,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            classToUse = colDef.cellClass(cellClassParams);
        } else {
            classToUse = colDef.cellClass;
        }

        if (typeof classToUse === 'string') {
            utils.addCssClass(eGridCell, classToUse);
        } else if (Array.isArray(classToUse)) {
            classToUse.forEach(function(cssClassItem) {
                utils.addCssClass(eGridCell, cssClassItem);
            });
        }
    }
};

RowRenderer.prototype.addClassesToCell = function(column, node, eGridCell) {
    var classes = ['ag-cell', 'ag-cell-no-focus', 'cell-col-' + column.index];
    if (node.group) {
        if (node.footer) {
            classes.push('ag-footer-cell');
        } else {
            classes.push('ag-group-cell');
        }
    }
    eGridCell.className = classes.join(' ');
};

RowRenderer.prototype.addClassesFromRules = function(colDef, eGridCell, value, node, rowIndex) {
    var classRules = colDef.cellClassRules;
    if (typeof classRules === 'object' && classRules !== null) {

        var params = {
            value: value,
            data: node.data,
            node: node,
            colDef: colDef,
            rowIndex: rowIndex,
            api: this.gridOptionsWrapper.getApi(),
            context: this.gridOptionsWrapper.getContext()
        };

        var classNames = Object.keys(classRules);
        for (var i = 0; i < classNames.length; i++) {
            var className = classNames[i];
            var rule = classRules[className];
            var resultOfRule;
            if (typeof rule === 'string') {
                resultOfRule = this.expressionService.evaluate(rule, params);
            } else if (typeof rule === 'function') {
                resultOfRule = rule(params);
            }
            if (resultOfRule) {
                utils.addCssClass(eGridCell, className);
            } else {
                utils.removeCssClass(eGridCell, className);
            }
        }
    }
};

RowRenderer.prototype.createCell = function(isFirstColumn, column, valueGetter, node, rowIndex, $childScope) {
    var that = this;
    var eGridCell = document.createElement("div");
    eGridCell.setAttribute("col", column.index);

    // only set tab index if cell selection is enabled
    if (!this.gridOptionsWrapper.isSuppressCellSelection()) {
        eGridCell.setAttribute("tabindex", "-1");
    }

    var value;
    if (valueGetter) {
        value = valueGetter();
    }

    // these are the grid styles, don't change between soft refreshes
    this.addClassesToCell(column, node, eGridCell);

    this.populateAndStyleGridCell(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, $childScope);

    this.addCellClickedHandler(eGridCell, node, column, value, rowIndex);
    this.addCellDoubleClickedHandler(eGridCell, node, column, value, rowIndex, $childScope, isFirstColumn, valueGetter);

    this.addCellNavigationHandler(eGridCell, rowIndex, column, node);

    eGridCell.style.width = utils.formatWidth(column.actualWidth);

    // add the 'start editing' call to the chain of editors
    this.renderedRowStartEditingListeners[rowIndex][column.colId] = function() {
        if (that.isCellEditable(column.colDef, node)) {
            that.startEditing(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter);
            return true;
        } else {
            return false;
        }
    };

    return eGridCell;
};

RowRenderer.prototype.addCellNavigationHandler = function(eGridCell, rowIndex, column, node) {
    var that = this;
    eGridCell.addEventListener('keydown', function(event) {
        if (that.editingCell) {
            return;
        }
        // only interested on key presses that are directly on this element, not any children elements. this
        // stops navigation if the user is in, for example, a text field inside the cell, and user hits
        // on of the keys we are looking for.
        if (event.target !== eGridCell) {
            return;
        }

        var key = event.which || event.keyCode;

        var startNavigation = key === constants.KEY_DOWN || key === constants.KEY_UP
            || key === constants.KEY_LEFT || key === constants.KEY_RIGHT;
        if (startNavigation) {
            event.preventDefault();
            that.navigateToNextCell(key, rowIndex, column);
        }

        var startEdit = key === constants.KEY_ENTER;
        if (startEdit) {
            var startEditingFunc = that.renderedRowStartEditingListeners[rowIndex][column.colId];
            if (startEditingFunc) {
                var editingStarted = startEditingFunc();
                if (editingStarted) {
                    // if we don't prevent default, then the editor that get displayed also picks up the 'enter key'
                    // press, and stops editing immediately, hence giving he user experience that nothing happened
                    event.preventDefault();
                }
            }
        }

        var selectRow = key === constants.KEY_SPACE;
        if (selectRow && that.gridOptionsWrapper.isRowSelection()) {
            var selected = that.selectionController.isNodeSelected(node);
            if (selected) {
                that.selectionController.deselectNode(node);
            } else {
                that.selectionController.selectNode(node, true);
            }
            event.preventDefault();
        }
    });
};

// we use index for rows, but column object for columns, as the next column (by index) might not
// be visible (header grouping) so it's not reliable, so using the column object instead.
RowRenderer.prototype.navigateToNextCell = function(key, rowIndex, column) {

    var cellToFocus = {rowIndex: rowIndex, column: column};
    var renderedRow;
    var eCell;

    // we keep searching for a next cell until we find one. this is how the group rows get skipped
    while (!eCell) {
        cellToFocus = this.getNextCellToFocus(key, cellToFocus);
        // no next cell means we have reached a grid boundary, eg left, right, top or bottom of grid
        if (!cellToFocus) {
            return;
        }
        // see if the next cell is selectable, if yes, use it, if not, skip it
        renderedRow = this.renderedRows[cellToFocus.rowIndex];
        eCell = renderedRow.eCells[cellToFocus.column.colId];
    }

    // this scrolls the row into view
    this.gridPanel.ensureIndexVisible(renderedRow.rowIndex);

    // this changes the css on the cell
    this.focusCell(eCell, cellToFocus.rowIndex, cellToFocus.column.index, true);
};

RowRenderer.prototype.getNextCellToFocus = function(key, lastCellToFocus) {
    var lastRowIndex = lastCellToFocus.rowIndex;
    var lastColumn = lastCellToFocus.column;

    var nextRowToFocus;
    var nextColumnToFocus;
    switch (key) {
        case constants.KEY_UP :
            // if already on top row, do nothing
            if (lastRowIndex === this.firstVirtualRenderedRow) {
                return null;
            }
            nextRowToFocus = lastRowIndex - 1;
            nextColumnToFocus = lastColumn;
            break;
        case constants.KEY_DOWN :
            // if already on bottom, do nothing
            if (lastRowIndex === this.lastVirtualRenderedRow) {
                return null;
            }
            nextRowToFocus = lastRowIndex + 1;
            nextColumnToFocus = lastColumn;
            break;
        case constants.KEY_RIGHT :
            var colToRight = this.columnModel.getVisibleColAfter(lastColumn);
            // if already on right, do nothing
            if (!colToRight) {
                return null;
            }
            nextRowToFocus = lastRowIndex ;
            nextColumnToFocus = colToRight;
            break;
        case constants.KEY_LEFT :
            var colToLeft = this.columnModel.getVisibleColBefore(lastColumn);
            // if already on left, do nothing
            if (!colToLeft) {
                return null;
            }
            nextRowToFocus = lastRowIndex ;
            nextColumnToFocus = colToLeft;
            break;
    }

    return {
        rowIndex: nextRowToFocus,
        column: nextColumnToFocus
    };
};

// called internally
RowRenderer.prototype.focusCell = function(eCell, rowIndex, colIndex, forceBrowserFocus) {
    // do nothing if cell selection is off
    if (this.gridOptionsWrapper.isSuppressCellSelection()) {
        return;
    }

    // remove any previous focus
    utils.querySelectorAll_replaceCssClass(this.eParentOfRows, '.ag-cell-focus', 'ag-cell-focus', 'ag-cell-no-focus');

    var selectorForCell = '[row="' + rowIndex + '"] [col="' + colIndex + '"]';
    utils.querySelectorAll_replaceCssClass(this.eParentOfRows, selectorForCell, 'ag-cell-no-focus', 'ag-cell-focus');

    this.focusedCell = {rowIndex: rowIndex, colIndex: colIndex, node: this.rowModel.getVirtualRow(rowIndex)};

    // this puts the browser focus on the cell (so it gets key presses)
    if (forceBrowserFocus) {
        eCell.focus();
    }

    if (typeof this.gridOptionsWrapper.getCellFocused() === 'function') {
        this.gridOptionsWrapper.getCellFocused()(this.focusedCell);
    }
};

// for API
RowRenderer.prototype.getFocusedCell = function() {
    return this.focusedCell;
};

// called via API
RowRenderer.prototype.setFocusedCell = function(rowIndex, colIndex) {
    var renderedRow = this.renderedRows[rowIndex];
    var column = this.columnModel.getDisplayedColumns()[colIndex];
    if (renderedRow && column) {
        var eCell = renderedRow.eCells[column.colId];
        this.focusCell(eCell, rowIndex, colIndex, true);
    }
};

RowRenderer.prototype.populateAndStyleGridCell = function(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, $childScope) {
    var colDef = column.colDef;

    // populate
    this.populateGridCell(eGridCell, isFirstColumn, node, column, rowIndex, value, valueGetter, $childScope);
    // style
    this.addStylesFromCollDef(column, value, node, $childScope, eGridCell);
    this.addClassesFromCollDef(colDef, value, node, $childScope, eGridCell);
    this.addClassesFromRules(colDef, eGridCell, value, node, rowIndex);
};

RowRenderer.prototype.populateGridCell = function(eGridCell, isFirstColumn, node, column, rowIndex, value, valueGetter, $childScope) {
    var eCellWrapper = document.createElement('span');
    utils.addCssClass(eCellWrapper, "ag-cell-wrapper");
    eGridCell.appendChild(eCellWrapper);

    var colDef = column.colDef;
    if (colDef.checkboxSelection) {
        var eCheckbox = this.selectionRendererFactory.createSelectionCheckbox(node, rowIndex);
        eCellWrapper.appendChild(eCheckbox);
    }

    // eventually we call eSpanWithValue.innerHTML = xxx, so cannot include the checkbox (above) in this span
    var eSpanWithValue = document.createElement("span");
    utils.addCssClass(eSpanWithValue, "ag-cell-value");

    eCellWrapper.appendChild(eSpanWithValue);

    var that = this;
    var refreshCellFunction = function() {
        that.softRefreshCell(eGridCell, isFirstColumn, node, column, $childScope, rowIndex);
    };

    this.putDataIntoCell(column, value, valueGetter, node, $childScope, eSpanWithValue, eGridCell, rowIndex, refreshCellFunction);
};

RowRenderer.prototype.addCellDoubleClickedHandler = function(eGridCell, node, column, value, rowIndex, $childScope, isFirstColumn, valueGetter) {
    var that = this;
    var colDef = column.colDef;
    eGridCell.addEventListener("dblclick", function(event) {
        if (that.gridOptionsWrapper.getCellDoubleClicked()) {
            var paramsForGrid = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            that.gridOptionsWrapper.getCellDoubleClicked()(paramsForGrid);
        }
        if (colDef.cellDoubleClicked) {
            var paramsForColDef = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.cellDoubleClicked(paramsForColDef);
        }
        if (that.isCellEditable(colDef, node)) {
            that.startEditing(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter);
        }
    });
};

RowRenderer.prototype.addCellClickedHandler = function(eGridCell, node, column, value, rowIndex) {
    var colDef = column.colDef;
    var that = this;
    eGridCell.addEventListener("click", function(event) {
        // we pass false to focusCell, as we don't want the cell to focus
        // also get the browser focus. if we did, then the cellRenderer could
        // have a text field in it, for example, and as the user clicks on the
        // text field, the text field, the focus doesn't get to the text
        // field, instead to goes to the div behind, making it impossible to
        // select the text field.
        that.focusCell(eGridCell, rowIndex, column.index, false);
        if (that.gridOptionsWrapper.getCellClicked()) {
            var paramsForGrid = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            that.gridOptionsWrapper.getCellClicked()(paramsForGrid);
        }
        if (colDef.cellClicked) {
            var paramsForColDef = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.cellClicked(paramsForColDef);
        }
    });
};

RowRenderer.prototype.isCellEditable = function(colDef, node) {
    if (this.editingCell) {
        return false;
    }

    // never allow editing of groups
    if (node.group) {
        return false;
    }

    // if boolean set, then just use it
    if (typeof colDef.editable === 'boolean') {
        return colDef.editable;
    }

    // if function, then call the function to find out
    if (typeof colDef.editable === 'function') {
        // should change this, so it gets passed params with nice useful values
        return colDef.editable(node.data);
    }

    return false;
};

RowRenderer.prototype.stopEditing = function(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter) {
    this.editingCell = false;
    var newValue = eInput.value;
    var colDef = column.colDef;

    //If we don't remove the blur listener first, we get:
    //Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler?
    eInput.removeEventListener('blur', blurListener);

    utils.removeAllChildren(eGridCell);

    var paramsForCallbacks = {
        node: node,
        data: node.data,
        oldValue: node.data[colDef.field],
        newValue: newValue,
        rowIndex: rowIndex,
        colDef: colDef,
        api: this.gridOptionsWrapper.getApi(),
        context: this.gridOptionsWrapper.getContext()
    };

    if (colDef.newValueHandler) {
        colDef.newValueHandler(paramsForCallbacks);
    } else {
        node.data[colDef.field] = newValue;
    }

    // at this point, the value has been updated
    var newValue;
    if (valueGetter) {
        newValue = valueGetter();
    }
    paramsForCallbacks.newValue = newValue;
    if (typeof colDef.cellValueChanged === 'function') {
        colDef.cellValueChanged(paramsForCallbacks);
    }
    if (typeof this.gridOptionsWrapper.getCellValueChanged() === 'function') {
        this.gridOptionsWrapper.getCellValueChanged()(paramsForCallbacks);
    }

    this.populateAndStyleGridCell(valueGetter, newValue, eGridCell, isFirstColumn, node, column, rowIndex, $childScope);
};

RowRenderer.prototype.startEditing = function(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter) {
    var that = this;
    this.editingCell = true;
    utils.removeAllChildren(eGridCell);
    var eInput = document.createElement('input');
    eInput.type = 'text';
    utils.addCssClass(eInput, 'ag-cell-edit-input');

    if (valueGetter) {
        var value = valueGetter();
        if (value !== null && value !== undefined) {
            eInput.value = value;
        }
    }

    eInput.style.width = (column.actualWidth - 14) + 'px';
    eGridCell.appendChild(eInput);
    eInput.focus();
    eInput.select();

    var blurListener = function() {
        that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
    };

    //stop entering if we loose focus
    eInput.addEventListener("blur", blurListener);

    //stop editing if enter pressed
    eInput.addEventListener('keypress', function(event) {
        var key = event.which || event.keyCode;
        // 13 is enter
        if (key == constants.KEY_ENTER) {
            that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
            that.focusCell(eGridCell, rowIndex, column.index, true);
        }
    });

    // tab key doesn't generate keypress, so need keydown to listen for that
    eInput.addEventListener('keydown', function(event) {
        var key = event.which || event.keyCode;
        if (key == constants.KEY_TAB) {
            that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
            that.startEditingNextCell(rowIndex, column, event.shiftKey);
            // we don't want the default tab action, so return false, this stops the event from bubbling
            event.preventDefault();
            return false;
        }
    });
};

RowRenderer.prototype.startEditingNextCell = function(rowIndex, column, shiftKey) {

    var firstRowToCheck = this.firstVirtualRenderedRow;
    var lastRowToCheck = this.lastVirtualRenderedRow;
    var currentRowIndex = rowIndex;

    var visibleColumns = this.columnModel.getDisplayedColumns();
    var currentCol = column;

    while (true) {

        var indexOfCurrentCol = visibleColumns.indexOf(currentCol);

        // move backward
        if (shiftKey) {
            // move along to the previous cell
            currentCol = visibleColumns[indexOfCurrentCol - 1];
            // check if end of the row, and if so, go back a row
            if (!currentCol) {
                currentCol = visibleColumns[visibleColumns.length - 1];
                currentRowIndex--;
            }

            // if got to end of rendered rows, then quit looking
            if (currentRowIndex < firstRowToCheck) {
                return;
            }
            // move forward
        } else {
            // move along to the next cell
            currentCol = visibleColumns[indexOfCurrentCol + 1];
            // check if end of the row, and if so, go forward a row
            if (!currentCol) {
                currentCol = visibleColumns[0];
                currentRowIndex++;
            }

            // if got to end of rendered rows, then quit looking
            if (currentRowIndex > lastRowToCheck) {
                return;
            }
        }

        var nextFunc = this.renderedRowStartEditingListeners[currentRowIndex][currentCol.colId];
        if (nextFunc) {
            // see if the next cell is editable, and if so, we have come to
            // the end of our search, so stop looking for the next cell
            var nextCellAcceptedEdit = nextFunc();
            if (nextCellAcceptedEdit) {
                return;
            }
        }
    }

};

module.exports = RowRenderer;

},{"./cellRenderers/groupCellRendererFactory":2,"./constants":4,"./utils":39}],32:[function(require,module,exports){
var utils = require('./utils');

// these constants are used for determining if groups should
// be selected or deselected when selecting groups, and the group
// then selects the children.
var SELECTED = 0;
var UNSELECTED = 1;
var MIXED = 2;
var DO_NOT_CARE = 3;

function SelectionController() {}

SelectionController.prototype.init = function(angularGrid, gridPanel, gridOptionsWrapper, $scope, rowRenderer) {
    this.eRowsParent = gridPanel.getRowsParent();
    this.angularGrid = angularGrid;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.$scope = $scope;
    this.rowRenderer = rowRenderer;
    this.gridOptionsWrapper = gridOptionsWrapper;

    this.initSelectedNodesById();

    this.selectedRows = [];
    gridOptionsWrapper.setSelectedRows(this.selectedRows);
};

SelectionController.prototype.initSelectedNodesById = function() {
    this.selectedNodesById = {};
    this.gridOptionsWrapper.setSelectedNodesById(this.selectedNodesById);
};

SelectionController.prototype.getSelectedNodes = function() {
    var selectedNodes = [];
    var keys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var selectedNode = this.selectedNodesById[id];
        selectedNodes.push(selectedNode);
    }
    return selectedNodes;
};

// returns a list of all nodes at 'best cost' - a feature to be used
// with groups / trees. if a group has all it's children selected,
// then the group appears in the result, but not the children.
// Designed for use with 'children' as the group selection type,
// where groups don't actually appear in the selection normally.
SelectionController.prototype.getBestCostNodeSelection = function() {

    if (typeof this.rowModel.getTopLevelNodes !== 'function') {
        throw 'selectAll not available when rows are on the server';
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();

    var result = [];
    var that = this;

    // recursive function, to find the selected nodes
    function traverse(nodes) {
        for (var i = 0, l = nodes.length; i < l; i++) {
            var node = nodes[i];
            if (that.isNodeSelected(node)) {
                result.push(node);
            } else {
                // if not selected, then if it's a group, and the group
                // has children, continue to search for selections
                if (node.group && node.children) {
                    traverse(node.children);
                }
            }
        }
    }

    traverse(topLevelNodes);

    return result;
};

SelectionController.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

// public - this clears the selection, but doesn't clear down the css - when it is called, the
// caller then gets the grid to refresh.
SelectionController.prototype.deselectAll = function() {
    this.initSelectedNodesById();
    //var keys = Object.keys(this.selectedNodesById);
    //for (var i = 0; i < keys.length; i++) {
    //    delete this.selectedNodesById[keys[i]];
    //}
    this.syncSelectedRowsAndCallListener();
};

// public - this selects everything, but doesn't clear down the css - when it is called, the
// caller then gets the grid to refresh.
SelectionController.prototype.selectAll = function() {

    if (typeof this.rowModel.getTopLevelNodes !== 'function') {
        throw 'selectAll not available when rows are on the server';
    }

    var selectedNodesById = this.selectedNodesById;
    // if the selection is "don't include groups", then we don't include them!
    var includeGroups = !this.gridOptionsWrapper.isGroupSelectsChildren();

    function recursivelySelect(nodes) {
        if (nodes) {
            for (var i = 0; i<nodes.length; i++) {
                var node = nodes[i];
                if (node.group) {
                    recursivelySelect(node.children);
                    if (includeGroups) {
                        selectedNodesById[node.id] = node;
                    }
                } else {
                    selectedNodesById[node.id] = node;
                }
            }
        }
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();
    recursivelySelect(topLevelNodes);

    this.syncSelectedRowsAndCallListener();
};

// public
SelectionController.prototype.selectNode = function(node, tryMulti, suppressEvents) {
    var multiSelect = this.gridOptionsWrapper.isRowSelectionMulti() && tryMulti;

    // if the node is a group, then selecting this is the same as selecting the parent,
    // so to have only one flow through the below, we always select the header parent
    // (which then has the side effect of selecting the child).
    var nodeToSelect;
    if (node.footer) {
        nodeToSelect = node.sibling;
    } else {
        nodeToSelect = node;
    }

    // at the end, if this is true, we inform the callback
    var atLeastOneItemUnselected = false;
    var atLeastOneItemSelected = false;

    // see if rows to be deselected
    if (!multiSelect) {
        atLeastOneItemUnselected = this.doWorkOfDeselectAllNodes();
    }

    if (this.gridOptionsWrapper.isGroupSelectsChildren() && nodeToSelect.group) {
        // don't select the group, select the children instead
        atLeastOneItemSelected = this.recursivelySelectAllChildren(nodeToSelect);
    } else {
        // see if row needs to be selected
        atLeastOneItemSelected = this.doWorkOfSelectNode(nodeToSelect, suppressEvents);
    }

    if (atLeastOneItemUnselected || atLeastOneItemSelected) {
        this.syncSelectedRowsAndCallListener(suppressEvents);
    }

    this.updateGroupParentsIfNeeded();
};

SelectionController.prototype.recursivelySelectAllChildren = function(node, suppressEvents) {
    var atLeastOne = false;
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.group) {
                if (this.recursivelySelectAllChildren(child)) {
                    atLeastOne = true;
                }
            } else {
                if (this.doWorkOfSelectNode(child, suppressEvents)) {
                    atLeastOne = true;
                }
            }
        }
    }
    return atLeastOne;
};

SelectionController.prototype.recursivelyDeselectAllChildren = function(node) {
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.group) {
                this.recursivelyDeselectAllChildren(child);
            } else {
                this.deselectRealNode(child);
            }
        }
    }
};

// private
// 1 - selects a node
// 2 - updates the UI
// 3 - calls callbacks
SelectionController.prototype.doWorkOfSelectNode = function(node, suppressEvents) {
    if (this.selectedNodesById[node.id]) {
        return false;
    }

    this.selectedNodesById[node.id] = node;

    this.addCssClassForNode_andInformVirtualRowListener(node);

    // also color in the footer if there is one
    if (node.group && node.expanded && node.sibling) {
        this.addCssClassForNode_andInformVirtualRowListener(node.sibling);
    }

    // inform the rowSelected listener, if any
    if (!suppressEvents && typeof this.gridOptionsWrapper.getRowSelected() === "function") {
        this.gridOptionsWrapper.getRowSelected()(node.data, node);
    }

    return true;
};

// private
// 1 - selects a node
// 2 - updates the UI
// 3 - calls callbacks
// wow - what a big name for a method, exception case, it's saying what the method does
SelectionController.prototype.addCssClassForNode_andInformVirtualRowListener = function(node) {
    var virtualRenderedRowIndex = this.rowRenderer.getIndexOfRenderedNode(node);
    if (virtualRenderedRowIndex >= 0) {
        utils.querySelectorAll_addCssClass(this.eRowsParent, '[row="' + virtualRenderedRowIndex + '"]', 'ag-row-selected');

        // inform virtual row listener
        this.angularGrid.onVirtualRowSelected(virtualRenderedRowIndex, true);
    }
};

// private
// 1 - un-selects a node
// 2 - updates the UI
// 3 - calls callbacks
SelectionController.prototype.doWorkOfDeselectAllNodes = function(nodeToKeepSelected) {
    // not doing multi-select, so deselect everything other than the 'just selected' row
    var atLeastOneSelectionChange;
    var selectedNodeKeys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < selectedNodeKeys.length; i++) {
        // skip the 'just selected' row
        var key = selectedNodeKeys[i];
        var nodeToDeselect = this.selectedNodesById[key];
        if (nodeToDeselect === nodeToKeepSelected) {
            continue;
        } else {
            this.deselectRealNode(nodeToDeselect);
            atLeastOneSelectionChange = true;
        }
    }
    return atLeastOneSelectionChange;
};

// private
SelectionController.prototype.deselectRealNode = function(node) {
    // deselect the css
    this.removeCssClassForNode(node);

    // if node is a header, and if it has a sibling footer, deselect the footer also
    if (node.group && node.expanded && node.sibling) { // also check that it's expanded, as sibling could be a ghost
        this.removeCssClassForNode(node.sibling);
    }

    // remove the row
    delete this.selectedNodesById[node.id];
};

// private
SelectionController.prototype.removeCssClassForNode = function(node) {
    var virtualRenderedRowIndex = this.rowRenderer.getIndexOfRenderedNode(node);
    if (virtualRenderedRowIndex >= 0) {
        utils.querySelectorAll_removeCssClass(this.eRowsParent, '[row="' + virtualRenderedRowIndex + '"]', 'ag-row-selected');
        // inform virtual row listener
        this.angularGrid.onVirtualRowSelected(virtualRenderedRowIndex, false);
    }
};

// public (selectionRendererFactory)
SelectionController.prototype.deselectIndex = function(rowIndex) {
    var node = this.rowModel.getVirtualRow(rowIndex);
    this.deselectNode(node);
};

// public (api)
SelectionController.prototype.deselectNode = function(node) {
    if (node) {
        if (this.gridOptionsWrapper.isGroupSelectsChildren() && node.group) {
            // want to deselect children, not this node, so recursively deselect
            this.recursivelyDeselectAllChildren(node);
        } else {
            this.deselectRealNode(node);
        }
    }
    this.syncSelectedRowsAndCallListener();
    this.updateGroupParentsIfNeeded();
};

// public (selectionRendererFactory & api)
SelectionController.prototype.selectIndex = function(index, tryMulti, suppressEvents) {
    var node = this.rowModel.getVirtualRow(index);
    this.selectNode(node, tryMulti, suppressEvents);
};

// private
// updates the selectedRows with the selectedNodes and calls selectionChanged listener
SelectionController.prototype.syncSelectedRowsAndCallListener = function(suppressEvents) {
    // update selected rows
    var selectedRows = this.selectedRows;
    var oldCount = selectedRows.length;
    // clear selected rows
    selectedRows.length = 0;
    var keys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < keys.length; i++) {
        if (this.selectedNodesById[keys[i]] !== undefined) {
            var selectedNode = this.selectedNodesById[keys[i]];
            selectedRows.push(selectedNode.data);
        }
    }

    // this stope the event firing the very first the time grid is initialised. without this, the documentation
    // page had a popup in the 'selection' page as soon as the page was loaded!!
    var nothingChangedMustBeInitialising = oldCount === 0 && selectedRows.length === 0;

    if (!nothingChangedMustBeInitialising && !suppressEvents && typeof this.gridOptionsWrapper.getSelectionChanged() === "function") {
        this.gridOptionsWrapper.getSelectionChanged()();
    }

    var that = this;
    if (this.$scope) {
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

// private
SelectionController.prototype.recursivelyCheckIfSelected = function(node) {
    var foundSelected = false;
    var foundUnselected = false;

    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var result;
            if (child.group) {
                result = this.recursivelyCheckIfSelected(child);
                switch (result) {
                    case SELECTED:
                        foundSelected = true;
                        break;
                    case UNSELECTED:
                        foundUnselected = true;
                        break;
                    case MIXED:
                        foundSelected = true;
                        foundUnselected = true;
                        break;
                        // we can ignore the DO_NOT_CARE, as it doesn't impact, means the child
                        // has no children and shouldn't be considered when deciding
                }
            } else {
                if (this.isNodeSelected(child)) {
                    foundSelected = true;
                } else {
                    foundUnselected = true;
                }
            }

            if (foundSelected && foundUnselected) {
                // if mixed, then no need to go further, just return up the chain
                return MIXED;
            }
        }
    }

    // got this far, so no conflicts, either all children selected, unselected, or neither
    if (foundSelected) {
        return SELECTED;
    } else if (foundUnselected) {
        return UNSELECTED;
    } else {
        return DO_NOT_CARE;
    }
};

// public (selectionRendererFactory)
// returns:
// true: if selected
// false: if unselected
// undefined: if it's a group and 'children selection' is used and 'children' are a mix of selected and unselected
SelectionController.prototype.isNodeSelected = function(node) {
    if (this.gridOptionsWrapper.isGroupSelectsChildren() && node.group) {
        // doing child selection, we need to traverse the children
        var resultOfChildren = this.recursivelyCheckIfSelected(node);
        switch (resultOfChildren) {
            case SELECTED:
                return true;
            case UNSELECTED:
                return false;
            default:
                return undefined;
        }
    } else {
        return this.selectedNodesById[node.id] !== undefined;
    }
};

SelectionController.prototype.updateGroupParentsIfNeeded = function() {
    // we only do this if parent nodes are responsible
    // for selecting their children.
    if (!this.gridOptionsWrapper.isGroupSelectsChildren()) {
        return;
    }

    var firstRow = this.rowRenderer.getFirstVirtualRenderedRow();
    var lastRow = this.rowRenderer.getLastVirtualRenderedRow();
    for (var rowIndex = firstRow; rowIndex <= lastRow; rowIndex++) {
        // see if node is a group
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node.group) {
            var selected = this.isNodeSelected(node);
            this.angularGrid.onVirtualRowSelected(rowIndex, selected);

            if (selected) {
                utils.querySelectorAll_addCssClass(this.eRowsParent, '[row="' + rowIndex + '"]', 'ag-row-selected');
            } else {
                utils.querySelectorAll_removeCssClass(this.eRowsParent, '[row="' + rowIndex + '"]', 'ag-row-selected');
            }
        }
    }
};

module.exports = SelectionController;

},{"./utils":39}],33:[function(require,module,exports){
function SelectionRendererFactory() {}

SelectionRendererFactory.prototype.init = function(angularGrid, selectionController) {
    this.angularGrid = angularGrid;
    this.selectionController = selectionController;
};

SelectionRendererFactory.prototype.createCheckboxColDef = function() {
    return {
        width: 30,
        suppressMenu: true,
        suppressSorting: true,
        headerCellRenderer: function() {
            var eCheckbox = document.createElement('input');
            eCheckbox.type = 'checkbox';
            eCheckbox.name = 'name';
            return eCheckbox;
        },
        cellRenderer: this.createCheckboxRenderer()
    };
};

SelectionRendererFactory.prototype.createCheckboxRenderer = function() {
    var that = this;
    return function(params) {
        return that.createSelectionCheckbox(params.node, params.rowIndex);
    };
};

SelectionRendererFactory.prototype.createSelectionCheckbox = function(node, rowIndex) {

    var eCheckbox = document.createElement('input');
    eCheckbox.type = "checkbox";
    eCheckbox.name = "name";
    eCheckbox.className = 'ag-selection-checkbox';
    setCheckboxState(eCheckbox, this.selectionController.isNodeSelected(node));

    var that = this;
    eCheckbox.onclick = function(event) {
        event.stopPropagation();
    };

    eCheckbox.onchange = function() {
        var newValue = eCheckbox.checked;
        if (newValue) {
            that.selectionController.selectIndex(rowIndex, true);
        } else {
            that.selectionController.deselectIndex(rowIndex);
        }
    };

    this.angularGrid.addVirtualRowListener(rowIndex, {
        rowSelected: function(selected) {
            setCheckboxState(eCheckbox, selected);
        },
        rowRemoved: function() {}
    });

    return eCheckbox;
};

function setCheckboxState(eCheckbox, state) {
    if (typeof state === 'boolean') {
        eCheckbox.checked = state;
        eCheckbox.indeterminate = false;
    } else {
        // isNodeSelected returns back undefined if it's a group and the children
        // are a mix of selected and unselected
        eCheckbox.indeterminate = true;
    }
}

module.exports = SelectionRendererFactory;

},{}],34:[function(require,module,exports){
var SVG_NS = "http://www.w3.org/2000/svg";

function SvgFactory() {}

SvgFactory.prototype.createFilterSvg = function() {
    var eSvg = createIconSvg();

    var eFunnel = document.createElementNS(SVG_NS, "polygon");
    eFunnel.setAttribute("points", "0,0 4,4 4,10 6,10 6,4 10,0");
    eFunnel.setAttribute("class", "ag-header-icon");
    eSvg.appendChild(eFunnel);

    return eSvg;
};

SvgFactory.prototype.createColumnShowingSvg = function() {
    return createCircle(true);
};

SvgFactory.prototype.createColumnHiddenSvg = function() {
    return createCircle(false);
};

SvgFactory.prototype.createMenuSvg = function() {
    var eSvg = document.createElementNS(SVG_NS, "svg");
    var size = "12";
    eSvg.setAttribute("width", size);
    eSvg.setAttribute("height", size);

    ["0", "5", "10"].forEach(function(y) {
        var eLine = document.createElementNS(SVG_NS, "rect");
        eLine.setAttribute("y", y);
        eLine.setAttribute("width", size);
        eLine.setAttribute("height", "2");
        eLine.setAttribute("class", "ag-header-icon");
        eSvg.appendChild(eLine);
    });

    return eSvg;
};

SvgFactory.prototype.createArrowUpSvg = function() {
    return createPolygonSvg("0,10 5,0 10,10");
};

SvgFactory.prototype.createArrowLeftSvg = function() {
    return createPolygonSvg("10,0 0,5 10,10");
};

SvgFactory.prototype.createArrowDownSvg = function() {
    return createPolygonSvg("0,0 5,10 10,0");
};

SvgFactory.prototype.createArrowRightSvg = function() {
    return createPolygonSvg("0,0 10,5 0,10");
};

function createPolygonSvg(points) {
    var eSvg = createIconSvg();

    var eDescIcon = document.createElementNS(SVG_NS, "polygon");
    eDescIcon.setAttribute("points", points);
    eSvg.appendChild(eDescIcon);

    return eSvg;
}

// util function for the above
function createIconSvg() {
    var eSvg = document.createElementNS(SVG_NS, "svg");
    eSvg.setAttribute("width", "10");
    eSvg.setAttribute("height", "10");
    return eSvg;
}

function createCircle(fill) {
    var eSvg = createIconSvg();

    var eCircle = document.createElementNS(SVG_NS, "circle");
    eCircle.setAttribute("cx", "5");
    eCircle.setAttribute("cy", "5");
    eCircle.setAttribute("r", "5");
    eCircle.setAttribute("stroke", "black");
    eCircle.setAttribute("stroke-width", "2");
    if (fill) {
        eCircle.setAttribute("fill", "black");
    } else {
        eCircle.setAttribute("fill", "none");
    }
    eSvg.appendChild(eCircle);

    return eSvg;
};

module.exports = SvgFactory;

},{}],35:[function(require,module,exports){

function TemplateService() {
    this.templateCache = {};
    this.waitingCallbacks = {};
}

TemplateService.prototype.init = function ($scope) {
    this.$scope = $scope;
};

// returns the template if it is loaded, or null if it is not loaded
// but will call the callback when it is loaded
TemplateService.prototype.getTemplate = function (url, callback) {

    var templateFromCache = this.templateCache[url];
    if (templateFromCache) {
        return templateFromCache;
    }

    var callbackList = this.waitingCallbacks[url];
    var that = this;
    if (!callbackList) {
        // first time this was called, so need a new list for callbacks
        callbackList = [];
        this.waitingCallbacks[url] = callbackList;
        // and also need to do the http request
        var client = new XMLHttpRequest();
        client.onload = function () { that.handleHttpResult(this, url); };
        client.open("GET", url);
        client.send();
    }

    // add this callback
    if (callback) {
        callbackList.push(callback);
    }

    // caller needs to wait for template to load, so return null
    return null;
};

TemplateService.prototype.handleHttpResult = function (httpResult, url) {

    if (httpResult.status !== 200 || httpResult.response === null) {
        console.warn('Unable to get template error ' + httpResult.status + ' - ' + url);
        return;
    }

    // response success, so process it
    this.templateCache[url] = httpResult.response;

    // inform all listeners that this is now in the cache
    var callbacks = this.waitingCallbacks[url];
    for (var i = 0; i < callbacks.length; i++) {
        var callback = callbacks[i];
        // we could pass the callback the response, however we know the client of this code
        // is the cell renderer, and it passes the 'cellRefresh' method in as the callback
        // which doesn't take any parameters.
        callback();
    }

    if (this.$scope) {
        var that = this;
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

module.exports = TemplateService;

},{}],36:[function(require,module,exports){
var CheckboxSelection = require("../widgets/checkboxSelection");
var utils = require('./../utils');
var BorderLayout = require('../layout/BorderLayout');
var SvgFactory = require('../svgFactory');

var svgFactory = new SvgFactory();

function ColumnSelectionPanel(columnController, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.setupComponents();
    this.columnController = columnController;

    var that = this;
    this.columnController.addListener({
        columnsChanged: that.columnsChanged.bind(that)
    });
}

ColumnSelectionPanel.prototype.columnsChanged = function(newColumns) {
    this.cColumnList.setModel(newColumns);
};

ColumnSelectionPanel.prototype.getColumnList = function() {
    return this.cColumnList;
};

ColumnSelectionPanel.prototype.columnCellRenderer = function(params) {
    var column = params.value;
    var colDisplayName = this.columnController.getDisplayNameForCol(column);

    var eResult = document.createElement('span');

    var eVisibleIcons = document.createElement('span');
    utils.addCssClass(eVisibleIcons, 'ag-visible-icons');
    var eShowing = utils.createIcon('columnVisible', this.gridOptionsWrapper, column, svgFactory.createColumnShowingSvg);
    var eHidden = utils.createIcon('columnHidden', this.gridOptionsWrapper, column, svgFactory.createColumnHiddenSvg);
    eVisibleIcons.appendChild(eShowing);
    eVisibleIcons.appendChild(eHidden);
    eShowing.style.display = column.visible ? '' : 'none';
    eHidden.style.display = column.visible ? 'none' : '';
    eResult.appendChild(eVisibleIcons);

    var eValue = document.createElement('span');
    eValue.innerHTML = colDisplayName;
    eResult.appendChild(eValue);

    if (!column.visible) {
        utils.addCssClass(eResult, 'ag-column-not-visible');
    }

    // change visible if use clicks the visible icon, or if row is double clicked
    eVisibleIcons.addEventListener('click', showEventListener);

    var that = this;
    function showEventListener() {
        column.visible = !column.visible;
        that.cColumnList.refreshView();
        that.columnController.onColumnStateChanged();
    }

    return eResult;
};

ColumnSelectionPanel.prototype.setupComponents = function() {

    this.cColumnList = new CheckboxSelection();
    this.cColumnList.setCellRenderer(this.columnCellRenderer.bind(this));

    var that = this;
    this.cColumnList.addModelChangedListener( function() {
        that.columnController.onColumnStateChanged();
    });

    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    var columnsLocalText = localeTextFunc('columns', 'Columns');

    var eNorthPanel = document.createElement('div');
    eNorthPanel.innerHTML = '<div style="text-align: center;">'+columnsLocalText+'</div>';

    this.layout = new BorderLayout({
        center: this.cColumnList.getGui(),
        north: eNorthPanel
    });
};

// not sure if this is called anywhere
ColumnSelectionPanel.prototype.setSelected = function(column, selected) {
    column.visible = selected;
    this.columnController.onColumnStateChanged();
};

ColumnSelectionPanel.prototype.getGui = function() {
    return this.eRootPanel.getGui();
};

module.exports = ColumnSelectionPanel;

},{"../layout/BorderLayout":24,"../svgFactory":34,"../widgets/checkboxSelection":41,"./../utils":39}],37:[function(require,module,exports){
var CheckboxSelection = require("../widgets/checkboxSelection");
var constants = require('../constants');
var utils = require('../utils');
var BorderLayout = require('../layout/borderLayout');
var SvgFactory = require('../svgFactory');

var svgFactory = new SvgFactory();

function GroupSelectionPanel(columnController, inMemoryRowController, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.setupComponents();
    this.columnController = columnController;
    this.inMemoryRowController = inMemoryRowController;

    var that = this;
    this.columnController.addListener({
        columnsChanged: that.columnsChanged.bind(that)
    });
}

GroupSelectionPanel.prototype.columnsChanged = function(newColumns, newGroupedColumns) {
    this.cColumnList.setModel(newGroupedColumns);
};

GroupSelectionPanel.prototype.getColumnList = function() {
    return this.cColumnList;
};

GroupSelectionPanel.prototype.columnCellRenderer = function(params) {
    var column = params.value;
    var colDisplayName = this.columnController.getDisplayNameForCol(column);

    var eResult = document.createElement('span');

    var eRemove = utils.createIcon('columnRemoveFromGroupIcon', this.gridOptionsWrapper, column, svgFactory.createArrowUpSvg);
    utils.addCssClass(eRemove, 'ag-visible-icons');
    eResult.appendChild(eRemove);

    var that = this;
    eRemove.addEventListener('click', function () {
        var model = that.cColumnList.getModel();
        model.splice(model.indexOf(column), 1);
        that.cColumnList.setModel(model);
        that.onGroupingChanged();
    });

    var eValue = document.createElement('span');
    eValue.innerHTML = colDisplayName;
    eResult.appendChild(eValue);

    return eResult;
};

GroupSelectionPanel.prototype.setupComponents = function() {
    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    var columnsLocalText = localeTextFunc('pivotedColumns', 'Pivoted Columns');
    var pivotedColumnsEmptyMessage = localeTextFunc('pivotedColumnsEmptyMessage', 'Drag columns down from above to pivot by those columns');

    this.cColumnList = new CheckboxSelection();
    this.cColumnList.setCellRenderer(this.columnCellRenderer.bind(this));
    this.cColumnList.addModelChangedListener(this.onGroupingChanged.bind(this));
    this.cColumnList.setEmptyMessage(pivotedColumnsEmptyMessage);

    var eNorthPanel = document.createElement('div');
    eNorthPanel.style.paddingTop = '10px';
    eNorthPanel.innerHTML = '<div style="text-align: center;">'+columnsLocalText+'</div>';

    this.layout = new BorderLayout({
        center: this.cColumnList.getGui(),
        north: eNorthPanel
    });
};

GroupSelectionPanel.prototype.onGroupingChanged = function() {
    this.inMemoryRowController.doGrouping();
    this.inMemoryRowController.updateModel(constants.STEP_EVERYTHING);
    this.columnController.onColumnStateChanged();
};

GroupSelectionPanel.prototype.getGui = function() {
    return this.eRootPanel.getGui();
};

module.exports = GroupSelectionPanel;
},{"../constants":4,"../layout/borderLayout":25,"../svgFactory":34,"../utils":39,"../widgets/checkboxSelection":41}],38:[function(require,module,exports){
var utils = require('../utils');
var ColumnSelectionPanel = require('./columnSelectionPanel');
var GroupSelectionPanel = require('./groupSelectionPanel');
var VerticalStack = require('../layout/verticalStack');

function ToolPanel() {
    this.layout = new VerticalStack();
}

ToolPanel.prototype.init = function(columnController, inMemoryRowController, gridOptionsWrapper) {

    var columnSelectionPanel = new ColumnSelectionPanel(columnController, gridOptionsWrapper);
    this.layout.addPanel(columnSelectionPanel.layout, '50%');
    var groupSelectionPanel = new GroupSelectionPanel(columnController, inMemoryRowController, gridOptionsWrapper);
    this.layout.addPanel(groupSelectionPanel.layout, '50%');

    groupSelectionPanel.getColumnList().addDragSource(columnSelectionPanel.getColumnList().getUniqueId());

    var eGui = this.layout.getGui();

    utils.addCssClass(eGui, 'ag-tool-panel-container');
};

module.exports = ToolPanel;

},{"../layout/verticalStack":26,"../utils":39,"./columnSelectionPanel":36,"./groupSelectionPanel":37}],39:[function(require,module,exports){
function Utils() {}

var FUNCTION_STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var FUNCTION_ARGUMENT_NAMES = /([^\s,]+)/g;

Utils.prototype.iterateObject = function(object, callback) {
    var keys = Object.keys(object);
    for (var i = 0; i<keys.length; i++) {
        var key = keys[i];
        var value = object[key];
        callback(key, value);
    }
};

Utils.prototype.map = function(array, callback) {
    var result = [];
    for (var i = 0; i<array.length; i++) {
        var item = array[i];
        var mappedItem = callback(item);
        result.push(mappedItem);
    }
    return result;
};

Utils.prototype.getFunctionParameters = function(func) {
    var fnStr = func.toString().replace(FUNCTION_STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(FUNCTION_ARGUMENT_NAMES);
    if (result === null) {
        return [];
    } else {
        return result;
    }
};

Utils.prototype.toStrings = function(array) {
    return this.map(array, function (item) {
        if (item === undefined || item === null || !item.toString) {
            return null;
        } else {
            return item.toString();
        }
    });
};

/*
Utils.prototype.objectValuesToArray = function(object) {
    var keys = Object.keys(object);
    var result = [];
    for (var i = 0; i<keys.length; i++) {
        var key = keys[i];
        var value = object[key];
        result.push(value);
    }
    return result;
};
*/

Utils.prototype.iterateArray = function(array, callback) {
    for (var index = 0; index<array.length; index++) {
        var value = array[index];
        callback(value, index);
    }
};

Utils.prototype.getValue = function(expressionService, data, colDef, node, api, context) {

    var valueGetter = colDef.valueGetter;
    var field = colDef.field;

    // if there is a value getter, this gets precedence over a field
    if (valueGetter) {

        var params = {
            data: data,
            node: node,
            colDef: colDef,
            api: api,
            context: context
        };

        if (typeof valueGetter === 'function') {
            // valueGetter is a function, so just call it
            return valueGetter(params);
        } else if (typeof valueGetter === 'string') {
            // valueGetter is an expression, so execute the expression
            return expressionService.evaluate(valueGetter, params);
        }

    } else if (field && data) {
        return data[field];
    } else {
        return undefined;
    }
};

//Returns true if it is a DOM node
//taken from: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
Utils.prototype.isNode = function(o) {
    return (
        typeof Node === "object" ? o instanceof Node :
        o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
    );
};

//Returns true if it is a DOM element
//taken from: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
Utils.prototype.isElement = function(o) {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
    );
};

Utils.prototype.isNodeOrElement = function(o) {
    return this.isNode(o) || this.isElement(o);
};

//adds all type of change listeners to an element, intended to be a text field
Utils.prototype.addChangeListener = function(element, listener) {
    element.addEventListener("changed", listener);
    element.addEventListener("paste", listener);
    element.addEventListener("input", listener);
};

//if value is undefined, null or blank, returns null, otherwise returns the value
Utils.prototype.makeNull = function(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    } else {
        return value;
    }
};

Utils.prototype.removeAllChildren = function(node) {
    if (node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        }
    }
};

//adds an element to a div, but also adds a background checking for clicks,
//so that when the background is clicked, the child is removed again, giving
//a model look to popups.
Utils.prototype.addAsModalPopup = function(eParent, eChild) {
    var eBackdrop = document.createElement("div");
    eBackdrop.className = "ag-popup-backdrop";

    eBackdrop.onclick = function() {
        eParent.removeChild(eChild);
        eParent.removeChild(eBackdrop);
    };

    eParent.appendChild(eBackdrop);
    eParent.appendChild(eChild);
};

//loads the template and returns it as an element. makes up for no simple way in
//the dom api to load html directly, eg we cannot do this: document.createElement(template)
Utils.prototype.loadTemplate = function(template) {
    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = template;
    return tempDiv.firstChild;
};

//if passed '42px' then returns the number 42
Utils.prototype.pixelStringToNumber = function(val) {
    if (typeof val === "string") {
        if (val.indexOf("px") >= 0) {
            val.replace("px", "");
        }
        return parseInt(val);
    } else {
        return val;
    }
};

Utils.prototype.querySelectorAll_addCssClass = function(eParent, selector, cssClass) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.addCssClass(eRows[k], cssClass);
    }
};

Utils.prototype.querySelectorAll_removeCssClass = function(eParent, selector, cssClass) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.removeCssClass(eRows[k], cssClass);
    }
};

Utils.prototype.querySelectorAll_replaceCssClass = function(eParent, selector, cssClassToRemove, cssClassToAdd) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.removeCssClass(eRows[k], cssClassToRemove);
        this.addCssClass(eRows[k], cssClassToAdd);
    }
};

Utils.prototype.addOrRemoveCssClass = function(element, className, addOrRemove) {
    if (addOrRemove) {
        this.addCssClass(element, className);
    } else {
        this.removeCssClass(element, className);
    }
};

Utils.prototype.addCssClass = function(element, className) {
    if (element.className && element.className.length > 0) {
        var cssClasses = element.className.split(' ');
        if (cssClasses.indexOf(className) < 0) {
            cssClasses.push(className);
            element.className = cssClasses.join(' ');
        }
    } else {
        element.className = className;
    }
};

Utils.prototype.offsetHeight = function(element) {
    return element && element.clientHeight ? element.clientHeight : 0;
};

Utils.prototype.offsetWidth = function(element) {
    return element && element.clientWidth ? element.clientWidth : 0;
};

Utils.prototype.removeCssClass = function(element, className) {
    if (element.className && element.className.length > 0) {
        var cssClasses = element.className.split(' ');
        var index = cssClasses.indexOf(className);
        if (index >= 0) {
            cssClasses.splice(index, 1);
            element.className = cssClasses.join(' ');
        }
    }
};

Utils.prototype.removeFromArray = function(array, object) {
    array.splice(array.indexOf(object), 1);
};

Utils.prototype.defaultComparator = function(valueA, valueB) {
    var valueAMissing = valueA === null || valueA === undefined;
    var valueBMissing = valueB === null || valueB === undefined;
    if (valueAMissing && valueBMissing) {
        return 0;
    }
    if (valueAMissing) {
        return -1;
    }
    if (valueBMissing) {
        return 1;
    }

    if (valueA < valueB) {
        return -1;
    } else if (valueA > valueB) {
        return 1;
    } else {
        return 0;
    }
};

Utils.prototype.formatWidth = function(width) {
    if (typeof width === "number") {
        return width + "px";
    } else {
        return width;
    }
};

// tries to use the provided renderer. if a renderer found, returns true.
// if no renderer, returns false.
Utils.prototype.useRenderer = function(eParent, eRenderer, params) {
    var resultFromRenderer = eRenderer(params);
    if (this.isNode(resultFromRenderer) || this.isElement(resultFromRenderer)) {
        //a dom node or element was returned, so add child
        eParent.appendChild(resultFromRenderer);
    } else {
        //otherwise assume it was html, so just insert
        var eTextSpan = document.createElement('span');
        eTextSpan.innerHTML = resultFromRenderer;
        eParent.appendChild(eTextSpan);
    }
};

// if icon provided, use this (either a string, or a function callback).
// if not, then use the second parameter, which is the svgFactory function
Utils.prototype.createIcon = function(iconName, gridOptionsWrapper, colDefWrapper, svgFactoryFunc) {
    var eResult = document.createElement('span');
    var userProvidedIcon;
    // check col for icon first
    if (colDefWrapper && colDefWrapper.colDef.icons) {
        userProvidedIcon = colDefWrapper.colDef.icons[iconName];
    }
    // it not in col, try grid options
    if (!userProvidedIcon && gridOptionsWrapper.getIcons()) {
        userProvidedIcon = gridOptionsWrapper.getIcons()[iconName];
    }
    // now if user provided, use it
    if (userProvidedIcon) {
        var rendererResult;
        if (typeof userProvidedIcon === 'function') {
            rendererResult = userProvidedIcon();
        } else if (typeof userProvidedIcon === 'string') {
            rendererResult = userProvidedIcon;
        } else {
            throw 'icon from grid options needs to be a string or a function';
        }
        if (typeof rendererResult === 'string') {
            eResult.innerHTML = rendererResult;
        } else if (this.isNodeOrElement(rendererResult)) {
            eResult.appendChild(rendererResult);
        } else {
            throw 'iconRenderer should return back a string or a dom object';
        }
    } else {
        // otherwise we use the built in icon
        eResult.appendChild(svgFactoryFunc());
    }
    return eResult;
};


Utils.prototype.getScrollbarWidth = function () {
    var outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.width = "100px";
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

    document.body.appendChild(outer);

    var widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = "scroll";

    // add innerdiv
    var inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);

    var widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
};

Utils.prototype.isKeyPressed = function(event, keyToCheck) {
    var pressedKey = event.which || event.keyCode;
    return pressedKey === keyToCheck;
};

Utils.prototype.setVisible = function(element, visible) {
    if (visible) {
        element.style.display = 'inline';
    } else {
        element.style.display = 'none';
    }
};

module.exports = new Utils();

},{}],40:[function(require,module,exports){
module.exports = "<div class=ag-list-selection><div><div ag-repeat></div></div></div>";

},{}],41:[function(require,module,exports){
var template = require('./checkboxSelection.html');
var utils = require('../utils');
var dragAndDropService = require('../dragAndDrop/dragAndDropService');

var NOT_DROP_TARGET = 0;
var DROP_TARGET_ABOVE = 1;
var DROP_TARGET_BELOW = -11;

function CheckboxSelection() {
    this.setupComponents();
    this.uniqueId = 'CheckboxSelection-' + Math.random();
    this.modelChangedListeners = [];
    this.dragSources = [];
    this.setupAsDropTarget();
}

CheckboxSelection.prototype.setEmptyMessage = function(emptyMessage) {
    return this.emptyMessage = emptyMessage;
    this.refreshView();
};

CheckboxSelection.prototype.getUniqueId = function() {
    return this.uniqueId;
};

CheckboxSelection.prototype.addDragSource = function(dragSource) {
    this.dragSources.push(dragSource);
};

CheckboxSelection.prototype.addModelChangedListener = function(listener) {
    this.modelChangedListeners.push(listener);
};

CheckboxSelection.prototype.fireModelChanged = function() {
    for (var i = 0; i<this.modelChangedListeners.length; i++) {
        this.modelChangedListeners[i]();
    }
};

CheckboxSelection.prototype.setupComponents = function() {

    this.eGui = utils.loadTemplate(template);
    this.eFilterValueTemplate = this.eGui.querySelector("[ag-repeat]");

    this.eListParent = this.eFilterValueTemplate.parentNode;
    utils.removeAllChildren(this.eListParent);
};

CheckboxSelection.prototype.setModel = function(model) {
    this.model = model;
    this.refreshView();
};

CheckboxSelection.prototype.getModel = function() {
    return this.model;
};

CheckboxSelection.prototype.setCellRenderer = function(cellRenderer) {
    this.cellRenderer = cellRenderer;
};

CheckboxSelection.prototype.refreshView = function() {
    utils.removeAllChildren(this.eListParent);

    if (this.model && this.model.length > 0) {
        this.insertRows();
    } else {
        this.insertBlankMessage();
    }
};

CheckboxSelection.prototype.insertRows = function() {
    for (var i = 0; i<this.model.length; i++) {
        var item = this.model[i];
        //var text = this.getText(item);
        //var selected = this.isSelected(item);
        var eListItem = this.eFilterValueTemplate.cloneNode(true);

        if (this.cellRenderer) {
            var params = {value: item};
            utils.useRenderer(eListItem, this.cellRenderer, params);
        } else {
            eListItem.innerHTML = item;
        }

        this.addDragAndDropToListItem(eListItem, item);
        this.eListParent.appendChild(eListItem);
    }
};

CheckboxSelection.prototype.insertBlankMessage = function() {
    if (this.emptyMessage) {
        var eMessage = document.createElement('div');
        eMessage.style.color = 'grey';
        eMessage.style.padding = '20px';
        eMessage.style.textAlign = 'center';
        eMessage.innerHTML = this.emptyMessage;
        this.eListParent.appendChild(eMessage);
    }
};

CheckboxSelection.prototype.getDragItem = function() {
    return this.dragItem;
};

CheckboxSelection.prototype.setupAsDropTarget = function() {

    dragAndDropService.addDropTarget(this.eGui, {
        acceptDrag: this.externalAcceptDrag.bind(this),
        drop: this.externalDrop.bind(this),
        noDrop: this.externalNoDrop.bind(this)
    });
};

CheckboxSelection.prototype.externalAcceptDrag = function(dragEvent) {
    var allowedSource = this.dragSources.indexOf(dragEvent.containerId) >= 0;
    if (!allowedSource) {
        return false;
    }
    var alreadyHaveCol = this.model.indexOf(dragEvent.data) >= 0;
    if (alreadyHaveCol) {
        return false;
    }
    this.eGui.style.backgroundColor = 'lightgreen';
    return true;
};

CheckboxSelection.prototype.externalDrop = function(dragEvent) {
    this.addItemToList(dragEvent.data);
    this.eGui.style.backgroundColor = '';
};

CheckboxSelection.prototype.externalNoDrop = function() {
    this.eGui.style.backgroundColor = '';
};

CheckboxSelection.prototype.addItemToList = function(newItem) {
    this.model.push(newItem);
    this.refreshView();
    this.fireModelChanged();
};

CheckboxSelection.prototype.addDragAndDropToListItem = function(eListItem, item) {
    var that = this;
    dragAndDropService.addDragSource(eListItem, {
        getData: function() { return item; },
        getContainerId: function() { return that.uniqueId; }
    });
    dragAndDropService.addDropTarget(eListItem, {
        acceptDrag: function (dragItem) { return that.internalAcceptDrag(item, dragItem, eListItem); },
        drop: function (dragItem) { that.internalDrop(item, dragItem.data); },
        noDrop: function () { that.internalNoDrop(eListItem); }
    });
};

CheckboxSelection.prototype.internalAcceptDrag = function(targetColumn, dragItem, eListItem) {
    var result = dragItem.data !== targetColumn && dragItem.containerId === this.uniqueId;
    if (result) {
        if (this.dragAfterThisItem(targetColumn, dragItem.data)) {
            this.setDropCssClasses(eListItem, DROP_TARGET_ABOVE);
        } else {
            this.setDropCssClasses(eListItem, DROP_TARGET_BELOW);
        }
    }
    return result;
};

CheckboxSelection.prototype.internalDrop = function(targetColumn, draggedColumn) {
    var oldIndex = this.model.indexOf(draggedColumn);
    var newIndex = this.model.indexOf(targetColumn);

    this.model.splice(oldIndex, 1);
    this.model.splice(newIndex, 0, draggedColumn);

    this.refreshView();
    this.fireModelChanged();
};

CheckboxSelection.prototype.internalNoDrop = function(eListItem) {
    this.setDropCssClasses(eListItem, NOT_DROP_TARGET);
};

CheckboxSelection.prototype.dragAfterThisItem = function(targetColumn, draggedColumn) {
    return this.model.indexOf(targetColumn) < this.model.indexOf(draggedColumn);
};

CheckboxSelection.prototype.setDropCssClasses = function(eListItem, state) {
    utils.addOrRemoveCssClass(eListItem, 'ag-not-drop-target', state === NOT_DROP_TARGET);
    utils.addOrRemoveCssClass(eListItem, 'ag-drop-target-above', state === DROP_TARGET_ABOVE);
    utils.addOrRemoveCssClass(eListItem, 'ag-drop-target-below', state === DROP_TARGET_BELOW);
};

CheckboxSelection.prototype.getGui = function() {
    return this.eGui;
};

module.exports = CheckboxSelection;

},{"../dragAndDrop/dragAndDropService":5,"../utils":39,"./checkboxSelection.html":40}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9jZWxsUmVuZGVyZXJzL2dyb3VwQ2VsbFJlbmRlcmVyRmFjdG9yeS5qcyIsInNyYy9qcy9jb2x1bW5Db250cm9sbGVyLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9kcmFnQW5kRHJvcC9kcmFnQW5kRHJvcFNlcnZpY2UuanMiLCJzcmMvanMvZXhwYW5kQ3JlYXRvci5qcyIsInNyYy9qcy9leHByZXNzaW9uU2VydmljZS5qcyIsInNyYy9qcy9maWx0ZXIvZmlsdGVyTWFuYWdlci5qcyIsInNyYy9qcy9maWx0ZXIvbnVtYmVyRmlsdGVyLmh0bWwiLCJzcmMvanMvZmlsdGVyL251bWJlckZpbHRlci5qcyIsInNyYy9qcy9maWx0ZXIvc2V0RmlsdGVyLmh0bWwiLCJzcmMvanMvZmlsdGVyL3NldEZpbHRlci5qcyIsInNyYy9qcy9maWx0ZXIvc2V0RmlsdGVyTW9kZWwuanMiLCJzcmMvanMvZmlsdGVyL3RleHRGaWx0ZXIuaHRtbCIsInNyYy9qcy9maWx0ZXIvdGV4dEZpbHRlci5qcyIsInNyYy9qcy9ncmlkLmpzIiwic3JjL2pzL2dyaWRPcHRpb25zV3JhcHBlci5qcyIsInNyYy9qcy9ncmlkUGFuZWwvZ3JpZC5odG1sIiwic3JjL2pzL2dyaWRQYW5lbC9ncmlkTm9TY3JvbGxzLmh0bWwiLCJzcmMvanMvZ3JpZFBhbmVsL2dyaWRQYW5lbC5qcyIsInNyYy9qcy9ncmlkUGFuZWwvbG9hZGluZy5odG1sIiwic3JjL2pzL2dyb3VwQ3JlYXRvci5qcyIsInNyYy9qcy9oZWFkZXJSZW5kZXJlci5qcyIsInNyYy9qcy9sYXlvdXQvQm9yZGVyTGF5b3V0LmpzIiwic3JjL2pzL2xheW91dC92ZXJ0aWNhbFN0YWNrLmpzIiwic3JjL2pzL3Jvd0NvbnRyb2xsZXJzL2luTWVtb3J5Um93Q29udHJvbGxlci5qcyIsInNyYy9qcy9yb3dDb250cm9sbGVycy9wYWdpbmF0aW9uQ29udHJvbGxlci5qcyIsInNyYy9qcy9yb3dDb250cm9sbGVycy9wYWdpbmF0aW9uUGFuZWwuaHRtbCIsInNyYy9qcy9yb3dDb250cm9sbGVycy92aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIuanMiLCJzcmMvanMvcm93UmVuZGVyZXIuanMiLCJzcmMvanMvc2VsZWN0aW9uQ29udHJvbGxlci5qcyIsInNyYy9qcy9zZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkuanMiLCJzcmMvanMvc3ZnRmFjdG9yeS5qcyIsInNyYy9qcy90ZW1wbGF0ZVNlcnZpY2UuanMiLCJzcmMvanMvdG9vbFBhbmVsL2NvbHVtblNlbGVjdGlvblBhbmVsLmpzIiwic3JjL2pzL3Rvb2xQYW5lbC9ncm91cFNlbGVjdGlvblBhbmVsLmpzIiwic3JjL2pzL3Rvb2xQYW5lbC90b29sUGFuZWwuanMiLCJzcmMvanMvdXRpbHMuanMiLCJzcmMvanMvd2lkZ2V0cy9jaGVja2JveFNlbGVjdGlvbi5odG1sIiwic3JjL2pzL3dpZGdldHMvY2hlY2tib3hTZWxlY3Rpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2dCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoU0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6aUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xRQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxc0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVXQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBBbmd1bGFyIEdyaWRcclxuLy8gV3JpdHRlbiBieSBOaWFsbCBDcm9zYnlcclxuLy8gd3d3LmFuZ3VsYXJncmlkLmNvbVxyXG4vL1xyXG4vLyBWZXJzaW9uIDEuMTAuMFxyXG5cclxuKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIG9yIGBleHBvcnRzYFxyXG4gICAgdmFyIHJvb3QgPSB0aGlzO1xyXG4gICAgdmFyIEdyaWQgPSByZXF1aXJlKCcuL2dyaWQnKTtcclxuXHJcbiAgICAvLyBpZiBhbmd1bGFyIGlzIHByZXNlbnQsIHJlZ2lzdGVyIHRoZSBkaXJlY3RpdmVcclxuICAgIGlmICh0eXBlb2YgYW5ndWxhciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICB2YXIgYW5ndWxhck1vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwiYW5ndWxhckdyaWRcIiwgW10pO1xyXG4gICAgICAgIGFuZ3VsYXJNb2R1bGUuZGlyZWN0aXZlKFwiYW5ndWxhckdyaWRcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJBXCIsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRlbGVtZW50JywgJyRzY29wZScsICckY29tcGlsZScsIEFuZ3VsYXJEaXJlY3RpdmVDb250cm9sbGVyXSxcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhckdyaWQ6IFwiPVwiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYW5ndWxhck1vZHVsZS5kaXJlY3RpdmUoXCJhZ0dyaWRcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJBXCIsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRlbGVtZW50JywgJyRzY29wZScsICckY29tcGlsZScsICckYXR0cnMnLCBBbmd1bGFyRGlyZWN0aXZlQ29udHJvbGxlcl0sXHJcbiAgICAgICAgICAgICAgICBzY29wZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gYW5ndWxhckdyaWRHbG9iYWxGdW5jdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXhwb3J0cy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkR2xvYmFsRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgcm9vdC5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkR2xvYmFsRnVuY3Rpb247XHJcblxyXG4gICAgZnVuY3Rpb24gQW5ndWxhckRpcmVjdGl2ZUNvbnRyb2xsZXIoJGVsZW1lbnQsICRzY29wZSwgJGNvbXBpbGUsICRhdHRycykge1xyXG4gICAgICAgIHZhciBncmlkT3B0aW9ucztcclxuICAgICAgICB2YXIgcXVpY2tGaWx0ZXJPblNjb3BlO1xyXG4gICAgICAgIGlmICgkYXR0cnMpIHtcclxuICAgICAgICAgICAgLy8gbmV3IGRpcmVjdGl2ZSBvZiBhZy1ncmlkXHJcbiAgICAgICAgICAgIHZhciBrZXlPZkdyaWRJblNjb3BlID0gJGF0dHJzLmFnR3JpZDtcclxuICAgICAgICAgICAgcXVpY2tGaWx0ZXJPblNjb3BlID0ga2V5T2ZHcmlkSW5TY29wZSArICcucXVpY2tGaWx0ZXJUZXh0JztcclxuICAgICAgICAgICAgZ3JpZE9wdGlvbnMgPSAkc2NvcGUuJGV2YWwoa2V5T2ZHcmlkSW5TY29wZSk7XHJcbiAgICAgICAgICAgIGlmICghZ3JpZE9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldBUk5JTkcgLSBncmlkIG9wdGlvbnMgZm9yIEFuZ3VsYXIgR3JpZCBub3QgZm91bmQuIFBsZWFzZSBlbnN1cmUgdGhlIGF0dHJpYnV0ZSBhZy1ncmlkIHBvaW50cyB0byBhIHZhbGlkIG9iamVjdCBvbiB0aGUgc2NvcGVcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBvbGQgZGlyZWN0aXZlIG9mIGFuZ3VsYXItZ3JpZFxyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJXQVJOSU5HIC0gRGlyZWN0aXZlIGFuZ3VsYXItZ3JpZCBpcyBkZXByZWNhdGVkLCB5b3Ugc2hvdWxkIHVzZSB0aGUgYWctZ3JpZCBkaXJlY3RpdmUgaW5zdGVhZC5cIik7XHJcbiAgICAgICAgICAgIGdyaWRPcHRpb25zID0gJHNjb3BlLmFuZ3VsYXJHcmlkO1xyXG4gICAgICAgICAgICBxdWlja0ZpbHRlck9uU2NvcGUgPSAnYW5ndWxhckdyaWQucXVpY2tGaWx0ZXJUZXh0JztcclxuICAgICAgICAgICAgaWYgKCFncmlkT3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV0FSTklORyAtIGdyaWQgb3B0aW9ucyBmb3IgQW5ndWxhciBHcmlkIG5vdCBmb3VuZC4gUGxlYXNlIGVuc3VyZSB0aGUgYXR0cmlidXRlIGFuZ3VsYXItZ3JpZCBwb2ludHMgdG8gYSB2YWxpZCBvYmplY3Qgb24gdGhlIHNjb3BlXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZUdyaWREaXYgPSAkZWxlbWVudFswXTtcclxuICAgICAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGVHcmlkRGl2LCBncmlkT3B0aW9ucywgJHNjb3BlLCAkY29tcGlsZSwgcXVpY2tGaWx0ZXJPblNjb3BlKTtcclxuXHJcbiAgICAgICAgJHNjb3BlLiRvbihcIiRkZXN0cm95XCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBncmlkLnNldEZpbmlzaGVkKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2xvYmFsIEZ1bmN0aW9uIC0gdGhpcyBmdW5jdGlvbiBpcyB1c2VkIGZvciBjcmVhdGluZyBhIGdyaWQsIG91dHNpZGUgb2YgYW55IEFuZ3VsYXJKU1xyXG4gICAgZnVuY3Rpb24gYW5ndWxhckdyaWRHbG9iYWxGdW5jdGlvbihlbGVtZW50LCBncmlkT3B0aW9ucykge1xyXG4gICAgICAgIC8vIHNlZSBpZiBlbGVtZW50IGlzIGEgcXVlcnkgc2VsZWN0b3IsIG9yIGEgcmVhbCBlbGVtZW50XHJcbiAgICAgICAgdmFyIGVHcmlkRGl2O1xyXG4gICAgICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgZUdyaWREaXYgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoIWVHcmlkRGl2KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dBUk5JTkcgLSB3YXMgbm90IGFibGUgdG8gZmluZCBlbGVtZW50ICcgKyBlbGVtZW50ICsgJyBpbiB0aGUgRE9NLCBBbmd1bGFyIEdyaWQgaW5pdGlhbGlzYXRpb24gYWJvcnRlZC4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVHcmlkRGl2ID0gZWxlbWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbmV3IEdyaWQoZUdyaWREaXYsIGdyaWRPcHRpb25zLCBudWxsLCBudWxsKTtcclxuICAgIH1cclxuXHJcbn0pLmNhbGwod2luZG93KTtcclxuIiwidmFyIFN2Z0ZhY3RvcnkgPSByZXF1aXJlKCcuLi9zdmdGYWN0b3J5Jyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMnKTtcclxudmFyIHN2Z0ZhY3RvcnkgPSBuZXcgU3ZnRmFjdG9yeSgpO1xyXG5cclxuZnVuY3Rpb24gZ3JvdXBDZWxsUmVuZGVyZXJGYWN0b3J5KGdyaWRPcHRpb25zV3JhcHBlciwgc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KSB7XHJcblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGdyb3VwQ2VsbFJlbmRlcmVyKHBhcmFtcykge1xyXG5cclxuICAgICAgICB2YXIgZUdyb3VwQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgICAgICB2YXIgbm9kZSA9IHBhcmFtcy5ub2RlO1xyXG5cclxuICAgICAgICB2YXIgY2VsbEV4cGFuZGFibGUgPSBub2RlLmdyb3VwICYmICFub2RlLmZvb3RlcjtcclxuICAgICAgICBpZiAoY2VsbEV4cGFuZGFibGUpIHtcclxuICAgICAgICAgICAgYWRkRXhwYW5kQW5kQ29udHJhY3QoZUdyb3VwQ2VsbCwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBjaGVja2JveE5lZWRlZCA9IHBhcmFtcy5jb2xEZWYgJiYgcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIgJiYgcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIuY2hlY2tib3ggJiYgIW5vZGUuZm9vdGVyO1xyXG4gICAgICAgIGlmIChjaGVja2JveE5lZWRlZCkge1xyXG4gICAgICAgICAgICB2YXIgZUNoZWNrYm94ID0gc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LmNyZWF0ZVNlbGVjdGlvbkNoZWNrYm94KG5vZGUsIHBhcmFtcy5yb3dJbmRleCk7XHJcbiAgICAgICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUNoZWNrYm94KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMuY29sRGVmICYmIHBhcmFtcy5jb2xEZWYuY2VsbFJlbmRlcmVyICYmIHBhcmFtcy5jb2xEZWYuY2VsbFJlbmRlcmVyLmlubmVyUmVuZGVyZXIpIHtcclxuICAgICAgICAgICAgY3JlYXRlRnJvbUlubmVyUmVuZGVyZXIoZUdyb3VwQ2VsbCwgcGFyYW1zLCBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlci5pbm5lclJlbmRlcmVyKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuZm9vdGVyKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZUZvb3RlckNlbGwoZUdyb3VwQ2VsbCwgcGFyYW1zKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICAgICAgY3JlYXRlR3JvdXBDZWxsKGVHcm91cENlbGwsIHBhcmFtcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY3JlYXRlTGVhZkNlbGwoZUdyb3VwQ2VsbCwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBhbiBpbmRlbnQgLSBhcyB0aGlzIG92ZXJ3cml0ZXMgdGhlIHBhZGRpbmcgdGhhdFxyXG4gICAgICAgIC8vIHRoZSB0aGVtZSBzZXQsIHdoaWNoIHdpbGwgbWFrZSB0aGluZ3MgbG9vayAnbm90IGFsaWduZWQnIGZvciB0aGVcclxuICAgICAgICAvLyBmaXJzdCBncm91cCBsZXZlbC5cclxuICAgICAgICBpZiAobm9kZS5mb290ZXIgfHwgbm9kZS5sZXZlbCA+IDApIHtcclxuICAgICAgICAgICAgdmFyIHBhZGRpbmdQeCA9IG5vZGUubGV2ZWwgKiAxMDtcclxuICAgICAgICAgICAgaWYgKG5vZGUuZm9vdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBwYWRkaW5nUHggKz0gMTA7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5vZGUuZ3JvdXApIHtcclxuICAgICAgICAgICAgICAgIHBhZGRpbmdQeCArPSA1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVHcm91cENlbGwuc3R5bGUucGFkZGluZ0xlZnQgPSBwYWRkaW5nUHggKyAncHgnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVHcm91cENlbGw7XHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEV4cGFuZEFuZENvbnRyYWN0KGVHcm91cENlbGwsIHBhcmFtcykge1xyXG5cclxuICAgICAgICB2YXIgZUV4cGFuZEljb24gPSBjcmVhdGVHcm91cEV4cGFuZEljb24odHJ1ZSk7XHJcbiAgICAgICAgdmFyIGVDb250cmFjdEljb24gPSBjcmVhdGVHcm91cEV4cGFuZEljb24oZmFsc2UpO1xyXG4gICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUV4cGFuZEljb24pO1xyXG4gICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUNvbnRyYWN0SWNvbik7XHJcblxyXG4gICAgICAgIGVFeHBhbmRJY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXhwYW5kT3JDb250cmFjdCk7XHJcbiAgICAgICAgZUNvbnRyYWN0SWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV4cGFuZE9yQ29udHJhY3QpO1xyXG4gICAgICAgIGVHcm91cENlbGwuYWRkRXZlbnRMaXN0ZW5lcignZGJsY2xpY2snLCBleHBhbmRPckNvbnRyYWN0KTtcclxuXHJcbiAgICAgICAgc2hvd0FuZEhpZGVFeHBhbmRBbmRDb250cmFjdChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgcGFyYW1zLm5vZGUuZXhwYW5kZWQpO1xyXG5cclxuICAgICAgICAvLyBpZiBwYXJlbnQgY2VsbCB3YXMgcGFzc2VkLCB0aGVuIHdlIGNhbiBsaXN0ZW4gZm9yIHdoZW4gZm9jdXMgaXMgb24gdGhlIGNlbGwsXHJcbiAgICAgICAgLy8gYW5kIHRoZW4gZXhwYW5kIC8gY29udHJhY3QgYXMgdGhlIHVzZXIgaGl0cyBlbnRlciBvciBzcGFjZS1iYXJcclxuICAgICAgICBpZiAocGFyYW1zLmVHcmlkQ2VsbCkge1xyXG4gICAgICAgICAgICBwYXJhbXMuZUdyaWRDZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHV0aWxzLmlzS2V5UHJlc3NlZChldmVudCwgY29uc3RhbnRzLktFWV9FTlRFUikpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHBhbmRPckNvbnRyYWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBleHBhbmRPckNvbnRyYWN0KCkge1xyXG4gICAgICAgICAgICBleHBhbmRHcm91cChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2hvd0FuZEhpZGVFeHBhbmRBbmRDb250cmFjdChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgZXhwYW5kZWQpIHtcclxuICAgICAgICB1dGlscy5zZXRWaXNpYmxlKGVFeHBhbmRJY29uLCAhZXhwYW5kZWQpO1xyXG4gICAgICAgIHV0aWxzLnNldFZpc2libGUoZUNvbnRyYWN0SWNvbiwgZXhwYW5kZWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZUZyb21Jbm5lclJlbmRlcmVyKGVHcm91cENlbGwsIHBhcmFtcywgcmVuZGVyZXIpIHtcclxuICAgICAgICB1dGlscy51c2VSZW5kZXJlcihlR3JvdXBDZWxsLCByZW5kZXJlciwgcGFyYW1zKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBleHBhbmRHcm91cChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgcGFyYW1zKSB7XHJcbiAgICAgICAgcGFyYW1zLm5vZGUuZXhwYW5kZWQgPSAhcGFyYW1zLm5vZGUuZXhwYW5kZWQ7XHJcbiAgICAgICAgcGFyYW1zLmFwaS5vbkdyb3VwRXhwYW5kZWRPckNvbGxhcHNlZChwYXJhbXMucm93SW5kZXggKyAxKTtcclxuICAgICAgICBzaG93QW5kSGlkZUV4cGFuZEFuZENvbnRyYWN0KGVFeHBhbmRJY29uLCBlQ29udHJhY3RJY29uLCBwYXJhbXMubm9kZS5leHBhbmRlZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlR3JvdXBFeHBhbmRJY29uKGV4cGFuZGVkKSB7XHJcbiAgICAgICAgdmFyIGVJY29uO1xyXG4gICAgICAgIGlmIChleHBhbmRlZCkge1xyXG4gICAgICAgICAgICBlSWNvbiA9IHV0aWxzLmNyZWF0ZUljb24oJ2dyb3VwQ29udHJhY3RlZCcsIGdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd1JpZ2h0U3ZnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlSWNvbiA9IHV0aWxzLmNyZWF0ZUljb24oJ2dyb3VwRXhwYW5kZWQnLCBncmlkT3B0aW9uc1dyYXBwZXIsIG51bGwsIHN2Z0ZhY3RvcnkuY3JlYXRlQXJyb3dEb3duU3ZnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUljb24sICdhZy1ncm91cC1leHBhbmQnKTtcclxuICAgICAgICByZXR1cm4gZUljb247XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY3JlYXRlcyBjZWxsIHdpdGggJ1RvdGFsIHt7a2V5fX0nIGZvciBhIGdyb3VwXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVGb290ZXJDZWxsKGVHcm91cENlbGwsIHBhcmFtcykge1xyXG4gICAgICAgIHZhciB0ZXh0VG9EaXNwbGF5ID0gXCJUb3RhbCBcIiArIGdldEdyb3VwTmFtZShwYXJhbXMpO1xyXG4gICAgICAgIHZhciBlVGV4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHRUb0Rpc3BsYXkpO1xyXG4gICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZVRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEdyb3VwTmFtZShwYXJhbXMpIHtcclxuICAgICAgICB2YXIgY2VsbFJlbmRlcmVyID0gcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXI7XHJcbiAgICAgICAgaWYgKGNlbGxSZW5kZXJlciAmJiBjZWxsUmVuZGVyZXIua2V5TWFwXHJcbiAgICAgICAgICAgICYmIHR5cGVvZiBjZWxsUmVuZGVyZXIua2V5TWFwID09PSAnb2JqZWN0JyAmJiBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB2YXIgdmFsdWVGcm9tTWFwID0gY2VsbFJlbmRlcmVyLmtleU1hcFtwYXJhbXMubm9kZS5rZXldO1xyXG4gICAgICAgICAgICBpZiAodmFsdWVGcm9tTWFwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVGcm9tTWFwO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtcy5ub2RlLmtleTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXMubm9kZS5rZXk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNyZWF0ZXMgY2VsbCB3aXRoICd7e2tleX19ICh7e2NoaWxkQ291bnR9fSknIGZvciBhIGdyb3VwXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVHcm91cENlbGwoZUdyb3VwQ2VsbCwgcGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIGdyb3VwTmFtZSA9IGdldEdyb3VwTmFtZShwYXJhbXMpO1xyXG5cclxuICAgICAgICB2YXIgY29sRGVmT2ZHcm91cGVkQ29sID0gcGFyYW1zLmFwaS5nZXRDb2x1bW5EZWYocGFyYW1zLm5vZGUuZmllbGQpO1xyXG4gICAgICAgIGlmIChjb2xEZWZPZkdyb3VwZWRDb2wgJiYgdHlwZW9mIGNvbERlZk9mR3JvdXBlZENvbC5jZWxsUmVuZGVyZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgcGFyYW1zLnZhbHVlID0gZ3JvdXBOYW1lO1xyXG4gICAgICAgICAgICB1dGlscy51c2VSZW5kZXJlcihlR3JvdXBDZWxsLCBjb2xEZWZPZkdyb3VwZWRDb2wuY2VsbFJlbmRlcmVyLCBwYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZ3JvdXBOYW1lKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvbmx5IGluY2x1ZGUgdGhlIGNoaWxkIGNvdW50IGlmIGl0J3MgaW5jbHVkZWQsIGVnIGlmIHVzZXIgZG9pbmcgY3VzdG9tIGFnZ3JlZ2F0aW9uLFxyXG4gICAgICAgIC8vIHRoZW4gdGhpcyBjb3VsZCBiZSBsZWZ0IG91dCwgb3Igc2V0IHRvIC0xLCBpZSBubyBjaGlsZCBjb3VudFxyXG4gICAgICAgIHZhciBzdXBwcmVzc0NvdW50ID0gcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIgJiYgcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIuc3VwcHJlc3NDb3VudDtcclxuICAgICAgICBpZiAoIXN1cHByZXNzQ291bnQgJiYgcGFyYW1zLm5vZGUuYWxsQ2hpbGRyZW5Db3VudCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCIgKFwiICsgcGFyYW1zLm5vZGUuYWxsQ2hpbGRyZW5Db3VudCArIFwiKVwiKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNyZWF0ZXMgY2VsbCB3aXRoICd7e2tleX19ICh7e2NoaWxkQ291bnR9fSknIGZvciBhIGdyb3VwXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVMZWFmQ2VsbChlUGFyZW50LCBwYXJhbXMpIHtcclxuICAgICAgICBpZiAocGFyYW1zLnZhbHVlKSB7XHJcbiAgICAgICAgICAgIHZhciBlVGV4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcgJyArIHBhcmFtcy52YWx1ZSk7XHJcbiAgICAgICAgICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQoZVRleHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBncm91cENlbGxSZW5kZXJlckZhY3Rvcnk7IiwidmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxuXHJcbmZ1bmN0aW9uIENvbHVtbkNvbnRyb2xsZXIoKSB7XHJcbiAgICB0aGlzLmxpc3RlbmVycyA9IFtdO1xyXG4gICAgdGhpcy5jcmVhdGVNb2RlbCgpO1xyXG59XHJcblxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oYW5ndWxhckdyaWQsIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBleHByZXNzaW9uU2VydmljZSkge1xyXG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XHJcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XHJcbiAgICB0aGlzLnNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSA9IHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeTtcclxuICAgIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UgPSBleHByZXNzaW9uU2VydmljZTtcclxufTtcclxuXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmNyZWF0ZU1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLm1vZGVsID0ge1xyXG4gICAgICAgIC8vIHVzZWQgYnk6XHJcbiAgICAgICAgLy8gKyBpbk1lbW9yeVJvd0NvbnRyb2xsZXIgLT4gc29ydGluZywgYnVpbGRpbmcgcXVpY2sgZmlsdGVyIHRleHRcclxuICAgICAgICAvLyArIGhlYWRlclJlbmRlcmVyIC0+IHNvcnRpbmcgKGNsZWFyaW5nIGljb24pXHJcbiAgICAgICAgZ2V0QWxsQ29sdW1uczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmFsbENvbHVtbnM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyArIHJvd0NvbnRyb2xsZXIgLT4gd2hpbGUgaW5zZXJ0aW5nIHJvd3MsIGFuZCB3aGVuIHRhYmJpbmcgdGhyb3VnaCBjZWxscyAobmVlZCB0byBjaGFuZ2UgdGhpcylcclxuICAgICAgICAvLyBuZWVkIGEgbmV3TWV0aG9kIC0gZ2V0IG5leHQgY29sIGluZGV4XHJcbiAgICAgICAgZ2V0RGlzcGxheWVkQ29sdW1uczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmRpc3BsYXllZENvbHVtbnM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyArIHRvb2xQYW5lbFxyXG4gICAgICAgIGdldEdyb3VwZWRDb2x1bW5zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ3JvdXBlZENvbHVtbnM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyB1c2VkIGJ5OlxyXG4gICAgICAgIC8vICsgYW5ndWxhckdyaWQgLT4gZm9yIHNldHRpbmcgYm9keSB3aWR0aFxyXG4gICAgICAgIC8vICsgcm93Q29udHJvbGxlciAtPiBzZXR0aW5nIG1haW4gcm93IHdpZHRocyAod2hlbiBpbnNlcnRpbmcgYW5kIHJlc2l6aW5nKVxyXG4gICAgICAgIGdldEJvZHlDb250YWluZXJXaWR0aDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmdldFRvdGFsQ29sV2lkdGgoZmFsc2UpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gdXNlZCBieTpcclxuICAgICAgICAvLyArIGFuZ3VsYXJHcmlkIC0+IHNldHRpbmcgcGlubmVkIGJvZHkgd2lkdGhcclxuICAgICAgICBnZXRQaW5uZWRDb250YWluZXJXaWR0aDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmdldFRvdGFsQ29sV2lkdGgodHJ1ZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyB1c2VkIGJ5OlxyXG4gICAgICAgIC8vICsgaGVhZGVyUmVuZGVyZXIgLT4gc2V0dGluZyBwaW5uZWQgYm9keSB3aWR0aFxyXG4gICAgICAgIGdldEhlYWRlckdyb3VwczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmhlYWRlckdyb3VwcztcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHVzZWQgYnk6XHJcbiAgICAgICAgLy8gKyBhcGkuZ2V0RmlsdGVyTW9kZWwoKSAtPiB0byBtYXAgY29sRGVmIHRvIGNvbHVtbiwga2V5IGNhbiBiZSBjb2xEZWYgb3IgZmllbGRcclxuICAgICAgICBnZXRDb2x1bW46IGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5nZXRDb2x1bW4oa2V5KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHVzZWQgYnk6XHJcbiAgICAgICAgLy8gKyByb3dSZW5kZXJlciAtPiBmb3IgbmF2aWdhdGlvblxyXG4gICAgICAgIGdldFZpc2libGVDb2xCZWZvcmU6IGZ1bmN0aW9uKGNvbCkge1xyXG4gICAgICAgICAgICB2YXIgb2xkSW5kZXggPSB0aGF0LnZpc2libGVDb2x1bW5zLmluZGV4T2YoY29sKTtcclxuICAgICAgICAgICAgaWYgKG9sZEluZGV4ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoYXQudmlzaWJsZUNvbHVtbnNbb2xkSW5kZXggLSAxXTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyB1c2VkIGJ5OlxyXG4gICAgICAgIC8vICsgcm93UmVuZGVyZXIgLT4gZm9yIG5hdmlnYXRpb25cclxuICAgICAgICBnZXRWaXNpYmxlQ29sQWZ0ZXI6IGZ1bmN0aW9uKGNvbCkge1xyXG4gICAgICAgICAgICB2YXIgb2xkSW5kZXggPSB0aGF0LnZpc2libGVDb2x1bW5zLmluZGV4T2YoY29sKTtcclxuICAgICAgICAgICAgaWYgKG9sZEluZGV4IDwgKHRoYXQudmlzaWJsZUNvbHVtbnMubGVuZ3RoIC0gMSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGF0LnZpc2libGVDb2x1bW5zW29sZEluZGV4ICsgMV07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RGlzcGxheU5hbWVGb3JDb2w6IGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5nZXREaXNwbGF5TmFtZUZvckNvbChjb2x1bW4pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn07XHJcblxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5nZXRDb2x1bW4gPSBmdW5jdGlvbihrZXkpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpPHRoaXMuYWxsQ29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2xEZWZNYXRjaGVzID0gdGhpcy5hbGxDb2x1bW5zW2ldLmNvbERlZiA9PT0ga2V5O1xyXG4gICAgICAgIHZhciBmaWVsZE1hdGNoZXMgPSB0aGlzLmFsbENvbHVtbnNbaV0uY29sRGVmLmZpZWxkID09PSBrZXk7XHJcbiAgICAgICAgaWYgKGNvbERlZk1hdGNoZXMgfHwgZmllbGRNYXRjaGVzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFsbENvbHVtbnNbaV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0RGlzcGxheU5hbWVGb3JDb2wgPSBmdW5jdGlvbihjb2x1bW4pIHtcclxuXHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuICAgIHZhciBoZWFkZXJWYWx1ZUdldHRlciA9IGNvbERlZi5oZWFkZXJWYWx1ZUdldHRlcjtcclxuXHJcbiAgICBpZiAoaGVhZGVyVmFsdWVHZXR0ZXIpIHtcclxuICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcclxuICAgICAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKSxcclxuICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBoZWFkZXJWYWx1ZUdldHRlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAvLyB2YWx1ZUdldHRlciBpcyBhIGZ1bmN0aW9uLCBzbyBqdXN0IGNhbGwgaXRcclxuICAgICAgICAgICAgcmV0dXJuIGhlYWRlclZhbHVlR2V0dGVyKHBhcmFtcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaGVhZGVyVmFsdWVHZXR0ZXIgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIC8vIHZhbHVlR2V0dGVyIGlzIGFuIGV4cHJlc3Npb24sIHNvIGV4ZWN1dGUgdGhlIGV4cHJlc3Npb25cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UuZXZhbHVhdGUoaGVhZGVyVmFsdWVHZXR0ZXIsIHBhcmFtcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUodGhpcy5leHByZXNzaW9uU2VydmljZSwgdW5kZWZpbmVkLCBjb2xEZWYsIHVuZGVmaW5lZCwgYXBpLCBjb250ZXh0KTtcclxuICAgIH0gZWxzZSBpZiAoY29sRGVmLmRpc3BsYXlOYW1lKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiYWctZ3JpZDogRm91bmQgZGlzcGxheU5hbWUgXCIgKyBjb2xEZWYuZGlzcGxheU5hbWUgKyBcIiwgcGxlYXNlIHVzZSBoZWFkZXJOYW1lIGluc3RlYWQsIGRpc3BsYXlOYW1lIGlzIGRlcHJlY2F0ZWQuXCIpO1xyXG4gICAgICAgIHJldHVybiBjb2xEZWYuZGlzcGxheU5hbWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBjb2xEZWYuaGVhZGVyTmFtZTtcclxuICAgIH1cclxufTtcclxuXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24obGlzdGVuZXIpIHtcclxuICAgIHRoaXMubGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xyXG59O1xyXG5cclxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuZmlyZUNvbHVtbnNDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMubGlzdGVuZXJzW2ldLmNvbHVtbnNDaGFuZ2VkKHRoaXMuYWxsQ29sdW1ucywgdGhpcy5ncm91cGVkQ29sdW1ucyk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMubW9kZWw7XHJcbn07XHJcblxyXG4vLyBjYWxsZWQgYnkgYW5ndWxhckdyaWRcclxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuc2V0Q29sdW1ucyA9IGZ1bmN0aW9uKGNvbHVtbkRlZnMpIHtcclxuICAgIHRoaXMuY2hlY2tGb3JEZXByZWNhdGVkSXRlbXMoY29sdW1uRGVmcyk7XHJcbiAgICB0aGlzLmNyZWF0ZUNvbHVtbnMoY29sdW1uRGVmcyk7XHJcbiAgICB0aGlzLmNyZWF0ZUFnZ0NvbHVtbnMoKTtcclxuICAgIHRoaXMudXBkYXRlTW9kZWwoKTtcclxuICAgIHRoaXMuZmlyZUNvbHVtbnNDaGFuZ2VkKCk7XHJcbn07XHJcblxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jaGVja0ZvckRlcHJlY2F0ZWRJdGVtcyA9IGZ1bmN0aW9uKGNvbHVtbkRlZnMpIHtcclxuICAgIGlmIChjb2x1bW5EZWZzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8Y29sdW1uRGVmcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY29sRGVmID0gY29sdW1uRGVmc1tpXTtcclxuICAgICAgICAgICAgaWYgKGNvbERlZi5ncm91cCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQ6ICcgKyBjb2xEZWYuZmllbGQgKyAnIGNvbERlZi5ncm91cCBpcyBkZXByZWNhdGVkLCBwbGVhc2UgdXNlIGNvbERlZi5oZWFkZXJHcm91cCcpO1xyXG4gICAgICAgICAgICAgICAgY29sRGVmLmhlYWRlckdyb3VwID0gY29sRGVmLmdyb3VwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjb2xEZWYuZ3JvdXBTaG93ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogJyArIGNvbERlZi5maWVsZCArICcgY29sRGVmLmdyb3VwU2hvdyBpcyBkZXByZWNhdGVkLCBwbGVhc2UgdXNlIGNvbERlZi5oZWFkZXJHcm91cFNob3cnKTtcclxuICAgICAgICAgICAgICAgIGNvbERlZi5oZWFkZXJHcm91cFNob3cgPSBjb2xEZWYuZ3JvdXBTaG93O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gY2FsbGVkIGJ5IGhlYWRlclJlbmRlcmVyIC0gd2hlbiBhIGhlYWRlciBpcyBvcGVuZWQgb3IgY2xvc2VkXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmhlYWRlckdyb3VwT3BlbmVkID0gZnVuY3Rpb24oZ3JvdXApIHtcclxuICAgIGdyb3VwLmV4cGFuZGVkID0gIWdyb3VwLmV4cGFuZGVkO1xyXG4gICAgdGhpcy51cGRhdGVHcm91cHMoKTtcclxuICAgIHRoaXMudXBkYXRlRGlzcGxheWVkQ29sdW1ucygpO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5yZWZyZXNoSGVhZGVyQW5kQm9keSgpO1xyXG59O1xyXG5cclxuLy8gY2FsbGVkIGJ5IHRvb2xQYW5lbCAtIHdoZW4gY2hhbmdlIGluIGNvbHVtbnMgaGFwcGVuc1xyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5vbkNvbHVtblN0YXRlQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy51cGRhdGVNb2RlbCgpO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5yZWZyZXNoSGVhZGVyQW5kQm9keSgpO1xyXG59O1xyXG5cclxuLy8gY2FsbGVkIGZyb20gQVBJXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmhpZGVDb2x1bW5zID0gZnVuY3Rpb24oY29sSWRzLCBoaWRlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLmFsbENvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgaWRUaGlzQ29sID0gdGhpcy5hbGxDb2x1bW5zW2ldLmNvbElkO1xyXG4gICAgICAgIHZhciBoaWRlVGhpc0NvbCA9IGNvbElkcy5pbmRleE9mKGlkVGhpc0NvbCkgPj0gMDtcclxuICAgICAgICBpZiAoaGlkZVRoaXNDb2wpIHtcclxuICAgICAgICAgICAgdGhpcy5hbGxDb2x1bW5zW2ldLnZpc2libGUgPSAhaGlkZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLm9uQ29sdW1uU3RhdGVDaGFuZ2VkKCk7XHJcbiAgICB0aGlzLmZpcmVDb2x1bW5zQ2hhbmdlZCgpOyAvLyB0byB0ZWxsIHRvb2xiYXJcclxufTtcclxuXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZU1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVZpc2libGVDb2x1bW5zKCk7XHJcbiAgICB0aGlzLnVwZGF0ZVBpbm5lZENvbHVtbnMoKTtcclxuICAgIHRoaXMuYnVpbGRHcm91cHMoKTtcclxuICAgIHRoaXMudXBkYXRlR3JvdXBzKCk7XHJcbiAgICB0aGlzLnVwZGF0ZURpc3BsYXllZENvbHVtbnMoKTtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlRGlzcGxheWVkQ29sdW1ucyA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cEhlYWRlcnMoKSkge1xyXG4gICAgICAgIC8vIGlmIG5vdCBncm91cGluZyBieSBoZWFkZXJzLCB0aGVuIHB1bGwgdmlzaWJsZSBjb2xzXHJcbiAgICAgICAgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zID0gdGhpcy52aXNpYmxlQ29sdW1ucztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gaWYgZ3JvdXBpbmcsIHRoZW4gb25seSBzaG93IGNvbCBhcyBwZXIgZ3JvdXAgcnVsZXNcclxuICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaGVhZGVyR3JvdXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBncm91cCA9IHRoaXMuaGVhZGVyR3JvdXBzW2ldO1xyXG4gICAgICAgICAgICBncm91cC5hZGRUb1Zpc2libGVDb2x1bW5zKHRoaXMuZGlzcGxheWVkQ29sdW1ucyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufTtcclxuXHJcbi8vIHB1YmxpYyAtIGNhbGxlZCBmcm9tIGFwaVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5zaXplQ29sdW1uc1RvRml0ID0gZnVuY3Rpb24oZ3JpZFdpZHRoKSB7XHJcbiAgICAvLyBhdm9pZCBkaXZpZGUgYnkgemVyb1xyXG4gICAgaWYgKGdyaWRXaWR0aCA8PSAwIHx8IHRoaXMuZGlzcGxheWVkQ29sdW1ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGNvbHVtblN0YXJ0V2lkdGggPSAwOyAvLyB3aWxsIGNvbnRhaW4gdGhlIHN0YXJ0aW5nIHRvdGFsIHdpZHRoIG9mIHRoZSBjb2xzIGJlZW4gc3ByZWFkXHJcbiAgICB2YXIgY29sc1RvU3ByZWFkID0gW107IC8vIGFsbCB2aXNpYmxlIGNvbHMsIGV4Y2VwdCB0aG9zZSB3aXRoIGF2b2lkU2l6ZVRvRml0XHJcbiAgICB2YXIgd2lkdGhGb3JTcHJlYWRpbmcgPSBncmlkV2lkdGg7IC8vIGdyaWQgd2lkdGggbWludXMgdGhlIGNvbHVtbnMgd2UgYXJlIG5vdCByZXNpemluZ1xyXG5cclxuICAgIC8vIGdldCB0aGUgbGlzdCBvZiBjb2xzIHRvIHdvcmsgd2l0aFxyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpc3BsYXllZENvbHVtbnMubGVuZ3RoIDsgaisrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzcGxheWVkQ29sdW1uc1tqXS5jb2xEZWYuc3VwcHJlc3NTaXplVG9GaXQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgLy8gZG9uJ3QgaW5jbHVkZSBjb2wsIGFuZCByZW1vdmUgdGhlIHdpZHRoIGZyb20gdGVoIGF2YWlsYWJsZSB3aWR0aFxyXG4gICAgICAgICAgICB3aWR0aEZvclNwcmVhZGluZyAtPSB0aGlzLmRpc3BsYXllZENvbHVtbnNbal0uYWN0dWFsV2lkdGg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gaW5jbHVkZSB0aGUgY29sXHJcbiAgICAgICAgICAgIGNvbHNUb1NwcmVhZC5wdXNoKHRoaXMuZGlzcGxheWVkQ29sdW1uc1tqXSk7XHJcbiAgICAgICAgICAgIGNvbHVtblN0YXJ0V2lkdGggKz0gdGhpcy5kaXNwbGF5ZWRDb2x1bW5zW2pdLmFjdHVhbFdpZHRoO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiBubyB3aWR0aCBsZWZ0IG92ZXIgdG8gc3ByZWFkIHdpdGgsIGRvIG5vdGhpbmdcclxuICAgIGlmICh3aWR0aEZvclNwcmVhZGluZyA8PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzY2FsZSA9IHdpZHRoRm9yU3ByZWFkaW5nIC8gY29sdW1uU3RhcnRXaWR0aDtcclxuICAgIHZhciBwaXhlbHNGb3JMYXN0Q29sID0gd2lkdGhGb3JTcHJlYWRpbmc7XHJcblxyXG4gICAgLy8gc2l6ZSBhbGwgY29scyBleGNlcHQgdGhlIGxhc3QgYnkgdGhlIHNjYWxlXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IChjb2xzVG9TcHJlYWQubGVuZ3RoIC0gMSk7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2x1bW4gPSBjb2xzVG9TcHJlYWRbaV07XHJcbiAgICAgICAgdmFyIG5ld1dpZHRoID0gcGFyc2VJbnQoY29sdW1uLmFjdHVhbFdpZHRoICogc2NhbGUpO1xyXG4gICAgICAgIGNvbHVtbi5hY3R1YWxXaWR0aCA9IG5ld1dpZHRoO1xyXG4gICAgICAgIHBpeGVsc0Zvckxhc3RDb2wgLT0gbmV3V2lkdGg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2l6ZSB0aGUgbGFzdCBieSB3aGF0cyByZW1haW5pbmcgKHRoaXMgYXZvaWRzIHJvdW5kaW5nIGVycm9ycyB0aGF0IGNvdWxkXHJcbiAgICAvLyBvY2N1ciB3aXRoIHNjYWxpbmcgZXZlcnl0aGluZywgd2hlcmUgaXQgcmVzdWx0IGluIHNvbWUgcGl4ZWxzIG9mZilcclxuICAgIHZhciBsYXN0Q29sdW1uID0gY29sc1RvU3ByZWFkW2NvbHNUb1NwcmVhZC5sZW5ndGggLSAxXTtcclxuICAgIGxhc3RDb2x1bW4uYWN0dWFsV2lkdGggPSBwaXhlbHNGb3JMYXN0Q29sO1xyXG5cclxuICAgIC8vIHdpZHRocyBzZXQsIHJlZnJlc2ggdGhlIGd1aVxyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5yZWZyZXNoSGVhZGVyQW5kQm9keSgpO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5idWlsZEdyb3VwcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgLy8gaWYgbm90IGdyb3VwaW5nIGJ5IGhlYWRlcnMsIGRvIG5vdGhpbmdcclxuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cEhlYWRlcnMoKSkge1xyXG4gICAgICAgIHRoaXMuaGVhZGVyR3JvdXBzID0gbnVsbDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc3BsaXQgdGhlIGNvbHVtbnMgaW50byBncm91cHNcclxuICAgIHZhciBjdXJyZW50R3JvdXAgPSBudWxsO1xyXG4gICAgdGhpcy5oZWFkZXJHcm91cHMgPSBbXTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICB2YXIgbGFzdENvbFdhc1Bpbm5lZCA9IHRydWU7XHJcblxyXG4gICAgdGhpcy52aXNpYmxlQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgIC8vIGRvIHdlIG5lZWQgYSBuZXcgZ3JvdXAsIGJlY2F1c2Ugd2UgbW92ZSBmcm9tIHBpbm5lZCB0byBub24tcGlubmVkIGNvbHVtbnM/XHJcbiAgICAgICAgdmFyIGVuZE9mUGlubmVkSGVhZGVyID0gbGFzdENvbFdhc1Bpbm5lZCAmJiAhY29sdW1uLnBpbm5lZDtcclxuICAgICAgICBpZiAoIWNvbHVtbi5waW5uZWQpIHtcclxuICAgICAgICAgICAgbGFzdENvbFdhc1Bpbm5lZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBkbyB3ZSBuZWVkIGEgbmV3IGdyb3VwLCBiZWNhdXNlIHRoZSBncm91cCBuYW1lcyBkb2Vzbid0IG1hdGNoIGZyb20gcHJldmlvdXMgY29sP1xyXG4gICAgICAgIHZhciBncm91cEtleU1pc21hdGNoID0gY3VycmVudEdyb3VwICYmIGNvbHVtbi5jb2xEZWYuaGVhZGVyR3JvdXAgIT09IGN1cnJlbnRHcm91cC5uYW1lO1xyXG4gICAgICAgIC8vIHdlIGRvbid0IGdyb3VwIGNvbHVtbnMgd2hlcmUgbm8gZ3JvdXAgaXMgc3BlY2lmaWVkXHJcbiAgICAgICAgdmFyIGNvbE5vdEluR3JvdXAgPSBjdXJyZW50R3JvdXAgJiYgIWN1cnJlbnRHcm91cC5uYW1lO1xyXG4gICAgICAgIC8vIGRvIHdlIG5lZWQgYSBuZXcgZ3JvdXAsIGJlY2F1c2Ugd2UgYXJlIGp1c3Qgc3RhcnRpbmdcclxuICAgICAgICB2YXIgcHJvY2Vzc2luZ0ZpcnN0Q29sID0gY3VycmVudEdyb3VwID09PSBudWxsO1xyXG4gICAgICAgIHZhciBuZXdHcm91cE5lZWRlZCA9IHByb2Nlc3NpbmdGaXJzdENvbCB8fCBlbmRPZlBpbm5lZEhlYWRlciB8fCBncm91cEtleU1pc21hdGNoIHx8IGNvbE5vdEluR3JvdXA7XHJcbiAgICAgICAgLy8gY3JlYXRlIG5ldyBncm91cCwgaWYgaXQncyBuZWVkZWRcclxuICAgICAgICBpZiAobmV3R3JvdXBOZWVkZWQpIHtcclxuICAgICAgICAgICAgdmFyIHBpbm5lZCA9IGNvbHVtbi5waW5uZWQ7XHJcbiAgICAgICAgICAgIGN1cnJlbnRHcm91cCA9IG5ldyBoZWFkZXJHcm91cChwaW5uZWQsIGNvbHVtbi5jb2xEZWYuaGVhZGVyR3JvdXApO1xyXG4gICAgICAgICAgICB0aGF0LmhlYWRlckdyb3Vwcy5wdXNoKGN1cnJlbnRHcm91cCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRHcm91cC5hZGRDb2x1bW4oY29sdW1uKTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGVHcm91cHMgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIGlmIG5vdCBncm91cGluZyBieSBoZWFkZXJzLCBkbyBub3RoaW5nXHJcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBIZWFkZXJzKCkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmhlYWRlckdyb3Vwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBncm91cCA9IHRoaXMuaGVhZGVyR3JvdXBzW2ldO1xyXG4gICAgICAgIGdyb3VwLmNhbGN1bGF0ZUV4cGFuZGFibGUoKTtcclxuICAgICAgICBncm91cC5jYWxjdWxhdGVEaXNwbGF5ZWRDb2x1bW5zKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZVZpc2libGVDb2x1bW5zID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnZpc2libGVDb2x1bW5zID0gW107XHJcblxyXG4gICAgdmFyIG5lZWRBR3JvdXBDb2x1bW4gPSB0aGlzLmdyb3VwZWRDb2x1bW5zLmxlbmd0aCA+IDBcclxuICAgICAgICAmJiAhdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFN1cHByZXNzQXV0b0NvbHVtbigpXHJcbiAgICAgICAgJiYgIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBVc2VFbnRpcmVSb3coKTtcclxuXHJcbiAgICB2YXIgbG9jYWxlVGV4dEZ1bmMgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRMb2NhbGVUZXh0RnVuYygpO1xyXG5cclxuICAgIGlmIChuZWVkQUdyb3VwQ29sdW1uKSB7XHJcbiAgICAgICAgLy8gaWYgb25lIHByb3ZpZGVkIGJ5IHVzZXIsIHVzZSBpdCwgb3RoZXJ3aXNlIGNyZWF0ZSBvbmVcclxuICAgICAgICB2YXIgZ3JvdXBDb2xEZWYgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRHcm91cENvbHVtbkRlZigpO1xyXG4gICAgICAgIGlmICghZ3JvdXBDb2xEZWYpIHtcclxuICAgICAgICAgICAgZ3JvdXBDb2xEZWYgPSB7XHJcbiAgICAgICAgICAgICAgICBoZWFkZXJOYW1lOiBsb2NhbGVUZXh0RnVuYygnZ3JvdXAnLCdHcm91cCcpLFxyXG4gICAgICAgICAgICAgICAgY2VsbFJlbmRlcmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXI6IFwiZ3JvdXBcIlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBubyBncm91cCBjb2x1bW4gcHJvdmlkZWQsIG5lZWQgdG8gY3JlYXRlIG9uZSBoZXJlXHJcbiAgICAgICAgdmFyIGdyb3VwQ29sdW1uID0gbmV3IENvbHVtbihncm91cENvbERlZiwgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29sV2lkdGgoKSk7XHJcbiAgICAgICAgdGhpcy52aXNpYmxlQ29sdW1ucy5wdXNoKGdyb3VwQ29sdW1uKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYWxsQ29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2x1bW4gPSB0aGlzLmFsbENvbHVtbnNbaV07XHJcbiAgICAgICAgaWYgKGNvbHVtbi52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgIGNvbHVtbi5pbmRleCA9IHRoaXMudmlzaWJsZUNvbHVtbnMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLnZpc2libGVDb2x1bW5zLnB1c2godGhpcy5hbGxDb2x1bW5zW2ldKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZVBpbm5lZENvbHVtbnMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBwaW5uZWRDb2x1bW5Db3VudCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFBpbm5lZENvbENvdW50KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlzaWJsZUNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgcGlubmVkID0gaSA8IHBpbm5lZENvbHVtbkNvdW50O1xyXG4gICAgICAgIHRoaXMudmlzaWJsZUNvbHVtbnNbaV0ucGlubmVkID0gcGlubmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVDb2x1bW5zID0gZnVuY3Rpb24oY29sdW1uRGVmcykge1xyXG4gICAgdGhpcy5hbGxDb2x1bW5zID0gW107XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBpZiAoY29sdW1uRGVmcykge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1uRGVmcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY29sRGVmID0gY29sdW1uRGVmc1tpXTtcclxuICAgICAgICAgICAgLy8gdGhpcyBpcyBtZXNzeSAtIHdlIHN3YXAgaW4gYW5vdGhlciBjb2wgZGVmIGlmIGl0J3MgY2hlY2tib3ggc2VsZWN0aW9uIC0gbm90IGhhcHB5IDooXHJcbiAgICAgICAgICAgIGlmIChjb2xEZWYgPT09ICdjaGVja2JveFNlbGVjdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGNvbERlZiA9IHRoYXQuc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LmNyZWF0ZUNoZWNrYm94Q29sRGVmKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHdpZHRoID0gdGhhdC5jYWxjdWxhdGVDb2xJbml0aWFsV2lkdGgoY29sRGVmKTtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IG5ldyBDb2x1bW4oY29sRGVmLCB3aWR0aCk7XHJcbiAgICAgICAgICAgIHRoYXQuYWxsQ29sdW1ucy5wdXNoKGNvbHVtbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVBZ2dDb2x1bW5zID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmdyb3VwZWRDb2x1bW5zID0gW107XHJcbiAgICB2YXIgZ3JvdXBLZXlzID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBLZXlzKCk7XHJcbiAgICBpZiAoIWdyb3VwS2V5cyB8fCBncm91cEtleXMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3VwS2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBncm91cEtleSA9IGdyb3VwS2V5c1tpXTtcclxuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oZ3JvdXBLZXkpO1xyXG4gICAgICAgIGlmICghY29sdW1uKSB7XHJcbiAgICAgICAgICAgIGNvbHVtbiA9IHRoaXMuY3JlYXRlRHVtbXlDb2x1bW4oZ3JvdXBLZXkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmdyb3VwZWRDb2x1bW5zLnB1c2goY29sdW1uKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlRHVtbXlDb2x1bW4gPSBmdW5jdGlvbihmaWVsZCkge1xyXG4gICAgdmFyIGNvbERlZiA9IHtcclxuICAgICAgICBmaWVsZDogZmllbGQsXHJcbiAgICAgICAgaGVhZGVyTmFtZTogZmllbGQsXHJcbiAgICAgICAgaGlkZTogZmFsc2VcclxuICAgIH07XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb2xXaWR0aCgpO1xyXG4gICAgdmFyIGNvbHVtbiA9IG5ldyBDb2x1bW4oY29sRGVmLCB3aWR0aCk7XHJcbiAgICByZXR1cm4gY29sdW1uO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jYWxjdWxhdGVDb2xJbml0aWFsV2lkdGggPSBmdW5jdGlvbihjb2xEZWYpIHtcclxuICAgIGlmICghY29sRGVmLndpZHRoKSB7XHJcbiAgICAgICAgLy8gaWYgbm8gd2lkdGggZGVmaW5lZCBpbiBjb2xEZWYsIHVzZSBkZWZhdWx0XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbFdpZHRoKCk7XHJcbiAgICB9IGVsc2UgaWYgKGNvbERlZi53aWR0aCA8IGNvbnN0YW50cy5NSU5fQ09MX1dJRFRIKSB7XHJcbiAgICAgICAgLy8gaWYgd2lkdGggaW4gY29sIGRlZiB0byBzbWFsbCwgc2V0IHRvIG1pbiB3aWR0aFxyXG4gICAgICAgIHJldHVybiBjb25zdGFudHMuTUlOX0NPTF9XSURUSDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHVzZSB0aGUgcHJvdmlkZWQgd2lkdGhcclxuICAgICAgICByZXR1cm4gY29sRGVmLndpZHRoO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG4vLyBjYWxsIHdpdGggdHJ1ZSAocGlubmVkKSwgZmFsc2UgKG5vdC1waW5uZWQpIG9yIHVuZGVmaW5lZCAoYWxsIGNvbHVtbnMpXHJcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmdldFRvdGFsQ29sV2lkdGggPSBmdW5jdGlvbihpbmNsdWRlUGlubmVkKSB7XHJcbiAgICB2YXIgd2lkdGhTb0ZhciA9IDA7XHJcbiAgICB2YXIgcGluZWROb3RJbXBvcnRhbnQgPSB0eXBlb2YgaW5jbHVkZVBpbm5lZCAhPT0gJ2Jvb2xlYW4nO1xyXG5cclxuICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgIHZhciBpbmNsdWRlVGhpc0NvbCA9IHBpbmVkTm90SW1wb3J0YW50IHx8IGNvbHVtbi5waW5uZWQgPT09IGluY2x1ZGVQaW5uZWQ7XHJcbiAgICAgICAgaWYgKGluY2x1ZGVUaGlzQ29sKSB7XHJcbiAgICAgICAgICAgIHdpZHRoU29GYXIgKz0gY29sdW1uLmFjdHVhbFdpZHRoO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB3aWR0aFNvRmFyO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gaGVhZGVyR3JvdXAocGlubmVkLCBuYW1lKSB7XHJcbiAgICB0aGlzLnBpbm5lZCA9IHBpbm5lZDtcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLmFsbENvbHVtbnMgPSBbXTtcclxuICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucyA9IFtdO1xyXG4gICAgdGhpcy5leHBhbmRhYmxlID0gZmFsc2U7IC8vIHdoZXRoZXIgdGhpcyBncm91cCBjYW4gYmUgZXhwYW5kZWQgb3Igbm90XHJcbiAgICB0aGlzLmV4cGFuZGVkID0gZmFsc2U7XHJcbn1cclxuXHJcbmhlYWRlckdyb3VwLnByb3RvdHlwZS5hZGRDb2x1bW4gPSBmdW5jdGlvbihjb2x1bW4pIHtcclxuICAgIHRoaXMuYWxsQ29sdW1ucy5wdXNoKGNvbHVtbik7XHJcbn07XHJcblxyXG4vLyBuZWVkIHRvIGNoZWNrIHRoYXQgdGhpcyBncm91cCBoYXMgYXQgbGVhc3Qgb25lIGNvbCBzaG93aW5nIHdoZW4gYm90aCBleHBhbmRlZCBhbmQgY29udHJhY3RlZC5cclxuLy8gaWYgbm90LCB0aGVuIHdlIGRvbid0IGFsbG93IGV4cGFuZGluZyBhbmQgY29udHJhY3Rpbmcgb24gdGhpcyBncm91cFxyXG5oZWFkZXJHcm91cC5wcm90b3R5cGUuY2FsY3VsYXRlRXhwYW5kYWJsZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgLy8gd2FudCB0byBtYWtlIHN1cmUgdGhlIGdyb3VwIGRvZXNuJ3QgZGlzYXBwZWFyIHdoZW4gaXQncyBvcGVuXHJcbiAgICB2YXIgYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiA9IGZhbHNlO1xyXG4gICAgLy8gd2FudCB0byBtYWtlIHN1cmUgdGhlIGdyb3VwIGRvZXNuJ3QgZGlzYXBwZWFyIHdoZW4gaXQncyBjbG9zZWRcclxuICAgIHZhciBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgPSBmYWxzZTtcclxuICAgIC8vIHdhbnQgdG8gbWFrZSBzdXJlIHRoZSBncm91cCBoYXMgc29tZXRoaW5nIHRvIHNob3cgLyBoaWRlXHJcbiAgICB2YXIgYXRMZWFzdE9uZUNoYW5nZWFibGUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdGhpcy5hbGxDb2x1bW5zLmxlbmd0aDsgaSA8IGo7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2x1bW4gPSB0aGlzLmFsbENvbHVtbnNbaV07XHJcbiAgICAgICAgaWYgKGNvbHVtbi5jb2xEZWYuaGVhZGVyR3JvdXBTaG93ID09PSAnb3BlbicpIHtcclxuICAgICAgICAgICAgYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiA9IHRydWU7XHJcbiAgICAgICAgICAgIGF0TGVhc3RPbmVDaGFuZ2VhYmxlID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNvbHVtbi5jb2xEZWYuaGVhZGVyR3JvdXBTaG93ID09PSAnY2xvc2VkJykge1xyXG4gICAgICAgICAgICBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBhdExlYXN0T25lQ2hhbmdlYWJsZSA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiA9IHRydWU7XHJcbiAgICAgICAgICAgIGF0TGVhc3RPbmVTaG93aW5nV2hlbkNsb3NlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZXhwYW5kYWJsZSA9IGF0TGVhc3RPbmVTaG93aW5nV2hlbk9wZW4gJiYgYXRMZWFzdE9uZVNob3dpbmdXaGVuQ2xvc2VkICYmIGF0TGVhc3RPbmVDaGFuZ2VhYmxlO1xyXG59O1xyXG5cclxuaGVhZGVyR3JvdXAucHJvdG90eXBlLmNhbGN1bGF0ZURpc3BsYXllZENvbHVtbnMgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIGNsZWFyIG91dCBsYXN0IHRpbWUgd2UgY2FsY3VsYXRlZFxyXG4gICAgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zID0gW107XHJcbiAgICAvLyBpdCBub3QgZXhwYW5kYWJsZSwgZXZlcnl0aGluZyBpcyB2aXNpYmxlXHJcbiAgICBpZiAoIXRoaXMuZXhwYW5kYWJsZSkge1xyXG4gICAgICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucyA9IHRoaXMuYWxsQ29sdW1ucztcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBhbmQgY2FsY3VsYXRlIGFnYWluXHJcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IHRoaXMuYWxsQ29sdW1ucy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcclxuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5hbGxDb2x1bW5zW2ldO1xyXG4gICAgICAgIHN3aXRjaCAoY29sdW1uLmNvbERlZi5oZWFkZXJHcm91cFNob3cpIHtcclxuICAgICAgICAgICAgY2FzZSAnb3Blbic6XHJcbiAgICAgICAgICAgICAgICAvLyB3aGVuIHNldCB0byBvcGVuLCBvbmx5IHNob3cgY29sIGlmIGdyb3VwIGlzIG9wZW5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV4cGFuZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zLnB1c2goY29sdW1uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdjbG9zZWQnOlxyXG4gICAgICAgICAgICAgICAgLy8gd2hlbiBzZXQgdG8gb3Blbiwgb25seSBzaG93IGNvbCBpZiBncm91cCBpcyBvcGVuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZXhwYW5kZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMucHVzaChjb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IGlzIGFsd2F5cyBzaG93IHRoZSBjb2x1bW5cclxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucy5wdXNoKGNvbHVtbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBzaG91bGQgcmVwbGFjZSB3aXRoIHV0aWxzIG1ldGhvZCAnYWRkIGFsbCdcclxuaGVhZGVyR3JvdXAucHJvdG90eXBlLmFkZFRvVmlzaWJsZUNvbHVtbnMgPSBmdW5jdGlvbihjb2xzVG9BZGQpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGNvbHVtbiA9IHRoaXMuZGlzcGxheWVkQ29sdW1uc1tpXTtcclxuICAgICAgICBjb2xzVG9BZGQucHVzaChjb2x1bW4pO1xyXG4gICAgfVxyXG59O1xyXG5cclxudmFyIGNvbElkU2VxdWVuY2UgPSAwO1xyXG5cclxuZnVuY3Rpb24gQ29sdW1uKGNvbERlZiwgYWN0dWFsV2lkdGgsIGhpZGUpIHtcclxuICAgIHRoaXMuY29sRGVmID0gY29sRGVmO1xyXG4gICAgdGhpcy5hY3R1YWxXaWR0aCA9IGFjdHVhbFdpZHRoO1xyXG4gICAgdGhpcy52aXNpYmxlID0gIWNvbERlZi5oaWRlO1xyXG4gICAgLy8gaW4gdGhlIGZ1dHVyZSwgdGhlIGNvbEtleSBtaWdodCBiZSBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgaW5kZXhcclxuICAgIGlmIChjb2xEZWYuY29sSWQpIHtcclxuICAgICAgICB0aGlzLmNvbElkID0gY29sRGVmLmNvbElkO1xyXG4gICAgfWVsc2UgaWYgKGNvbERlZi5maWVsZCkge1xyXG4gICAgICAgIHRoaXMuY29sSWQgPSBjb2xEZWYuZmllbGQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY29sSWQgPSAnJyArIGNvbElkU2VxdWVuY2UrKztcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb2x1bW5Db250cm9sbGVyO1xyXG4iLCJ2YXIgY29uc3RhbnRzID0ge1xyXG4gICAgU1RFUF9FVkVSWVRISU5HOiAwLFxyXG4gICAgU1RFUF9GSUxURVI6IDEsXHJcbiAgICBTVEVQX1NPUlQ6IDIsXHJcbiAgICBTVEVQX01BUDogMyxcclxuICAgIEFTQzogXCJhc2NcIixcclxuICAgIERFU0M6IFwiZGVzY1wiLFxyXG4gICAgUk9XX0JVRkZFUl9TSVpFOiAyMCxcclxuICAgIFNPUlRfU1RZTEVfU0hPVzogXCJkaXNwbGF5OmlubGluZTtcIixcclxuICAgIFNPUlRfU1RZTEVfSElERTogXCJkaXNwbGF5Om5vbmU7XCIsXHJcbiAgICBNSU5fQ09MX1dJRFRIOiAxMCxcclxuXHJcbiAgICBLRVlfVEFCOiA5LFxyXG4gICAgS0VZX0VOVEVSOiAxMyxcclxuICAgIEtFWV9TUEFDRTogMzIsXHJcbiAgICBLRVlfRE9XTjogNDAsXHJcbiAgICBLRVlfVVA6IDM4LFxyXG4gICAgS0VZX0xFRlQ6IDM3LFxyXG4gICAgS0VZX1JJR0hUOiAzOVxyXG59O1xyXG5cclxuLy8gdGFrZW4gZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzk4NDc1ODAvaG93LXRvLWRldGVjdC1zYWZhcmktY2hyb21lLWllLWZpcmVmb3gtYW5kLW9wZXJhLWJyb3dzZXJcclxudmFyIGlzT3BlcmEgPSAhIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMDtcclxuLy8gT3BlcmEgOC4wKyAoVUEgZGV0ZWN0aW9uIHRvIGRldGVjdCBCbGluay92OC1wb3dlcmVkIE9wZXJhKVxyXG52YXIgaXNGaXJlZm94ID0gdHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJzsgICAvLyBGaXJlZm94IDEuMCtcclxudmFyIGlzU2FmYXJpID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDA7XHJcbi8vIEF0IGxlYXN0IFNhZmFyaSAzKzogXCJbb2JqZWN0IEhUTUxFbGVtZW50Q29uc3RydWN0b3JdXCJcclxudmFyIGlzQ2hyb21lID0gISF3aW5kb3cuY2hyb21lICYmICF0aGlzLmlzT3BlcmE7IC8vIENocm9tZSAxK1xyXG52YXIgaXNJRSA9IC8qQGNjX29uIUAqL2ZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlOyAvLyBBdCBsZWFzdCBJRTZcclxuXHJcbmlmIChpc09wZXJhKSB7XHJcbiAgICBjb25zdGFudHMuQlJPV1NFUiA9ICdvcGVyYSc7XHJcbn0gZWxzZSBpZiAoaXNGaXJlZm94KSB7XHJcbiAgICBjb25zdGFudHMuQlJPV1NFUiA9ICdmaXJlZm94JztcclxufSBlbHNlIGlmIChpc1NhZmFyaSkge1xyXG4gICAgY29uc3RhbnRzLkJST1dTRVIgPSAnc2FmYXJpJztcclxufSBlbHNlIGlmIChpc0Nocm9tZSkge1xyXG4gICAgY29uc3RhbnRzLkJST1dTRVIgPSAnY2hyb21lJztcclxufSBlbHNlIGlmIChpc0lFKSB7XHJcbiAgICBjb25zdGFudHMuQlJPV1NFUiA9ICdpZSc7XHJcbn1cclxuXHJcbnZhciBpc01hYyA9IG5hdmlnYXRvci5wbGF0Zm9ybS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ01BQycpPj0wO1xyXG52YXIgaXNXaW5kb3dzID0gbmF2aWdhdG9yLnBsYXRmb3JtLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignV0lOJyk+PTA7XHJcbmlmIChpc01hYykge1xyXG4gICAgY29uc3RhbnRzLlBMQVRGT1JNID0gJ21hYyc7XHJcbn0gZWxzZSBpZiAoaXNXaW5kb3dzKSB7XHJcbiAgICBjb25zdGFudHMuUExBVEZPUk0gPSAnd2luJztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb25zdGFudHM7XHJcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcblxyXG5mdW5jdGlvbiBEcmFnQW5kRHJvcFNlcnZpY2UoKSB7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5zdG9wRHJhZ2dpbmcuYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkRyYWdBbmREcm9wU2VydmljZS5wcm90b3R5cGUuc3RvcERyYWdnaW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5kcmFnSXRlbSkge1xyXG4gICAgICAgIHRoaXMuc2V0RHJhZ0Nzc0NsYXNzZXModGhpcy5kcmFnSXRlbS5lRHJhZ1NvdXJjZSwgZmFsc2UpO1xyXG4gICAgICAgIHRoaXMuZHJhZ0l0ZW0gPSBudWxsO1xyXG4gICAgfVxyXG59O1xyXG5cclxuRHJhZ0FuZERyb3BTZXJ2aWNlLnByb3RvdHlwZS5zZXREcmFnQ3NzQ2xhc3NlcyA9IGZ1bmN0aW9uKGVMaXN0SXRlbSwgZHJhZ2dpbmcpIHtcclxuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctZHJhZ2dpbmcnLCBkcmFnZ2luZyk7XHJcbiAgICB1dGlscy5hZGRPclJlbW92ZUNzc0NsYXNzKGVMaXN0SXRlbSwgJ2FnLW5vdC1kcmFnZ2luZycsICFkcmFnZ2luZyk7XHJcbn07XHJcblxyXG5EcmFnQW5kRHJvcFNlcnZpY2UucHJvdG90eXBlLmFkZERyYWdTb3VyY2UgPSBmdW5jdGlvbihlRHJhZ1NvdXJjZSwgZHJhZ1NvdXJjZUNhbGxiYWNrLCBjb250YWluZXJJZCkge1xyXG5cclxuICAgIHRoaXMuc2V0RHJhZ0Nzc0NsYXNzZXMoZURyYWdTb3VyY2UsIGZhbHNlKTtcclxuXHJcbiAgICB2YXIgbW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgZURyYWdTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgbW91c2VEb3duID0gdHJ1ZTtcclxuICAgIH0pO1xyXG5cclxuICAgIGVEcmFnU291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBtb3VzZURvd24gPSBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgIGVEcmFnU291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgbW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICBlRHJhZ1NvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBpZiAobW91c2VEb3duKSB7XHJcbiAgICAgICAgICAgIHZhciBhbHJlYWR5RHJhZ2dpbmdUaGlzSXRlbSA9IHRoaXMuZHJhZ0l0ZW0gJiYgdGhpcy5kcmFnSXRlbS5lRHJvcFNvdXJjZSA9PT0gZURyYWdTb3VyY2U7XHJcbiAgICAgICAgICAgIGlmICghYWxyZWFkeURyYWdnaW5nVGhpc0l0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc3RhcnREcmFnZ2luZyhlRHJhZ1NvdXJjZSwgZHJhZ1NvdXJjZUNhbGxiYWNrLCBjb250YWluZXJJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkRyYWdBbmREcm9wU2VydmljZS5wcm90b3R5cGUuc3RhcnREcmFnZ2luZyA9IGZ1bmN0aW9uKGVEcmFnU291cmNlLCBkcmFnU291cmNlQ2FsbGJhY2spIHtcclxuICAgIGlmICh0aGlzLmRyYWdJdGVtICYmIHRoaXMuZHJhZ0l0ZW0uZURyYWdTb3VyY2UgPT09IGVEcmFnU291cmNlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZHJhZ0l0ZW0pIHtcclxuICAgICAgICB0aGlzLnN0b3BEcmFnZ2luZygpO1xyXG4gICAgfVxyXG4gICAgdmFyIGRhdGE7XHJcbiAgICBpZiAoZHJhZ1NvdXJjZUNhbGxiYWNrLmdldERhdGEpIHtcclxuICAgICAgICBkYXRhID0gZHJhZ1NvdXJjZUNhbGxiYWNrLmdldERhdGEoKTtcclxuICAgIH1cclxuICAgIHZhciBjb250YWluZXJJZDtcclxuICAgIGlmIChkcmFnU291cmNlQ2FsbGJhY2suZ2V0Q29udGFpbmVySWQpIHtcclxuICAgICAgICBjb250YWluZXJJZCA9IGRyYWdTb3VyY2VDYWxsYmFjay5nZXRDb250YWluZXJJZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZHJhZ0l0ZW0gPSB7XHJcbiAgICAgICAgZURyYWdTb3VyY2U6IGVEcmFnU291cmNlLFxyXG4gICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgY29udGFpbmVySWQ6IGNvbnRhaW5lcklkXHJcbiAgICB9O1xyXG4gICAgdGhpcy5zZXREcmFnQ3NzQ2xhc3Nlcyh0aGlzLmRyYWdJdGVtLmVEcmFnU291cmNlLCB0cnVlKTtcclxufTtcclxuXHJcbkRyYWdBbmREcm9wU2VydmljZS5wcm90b3R5cGUuYWRkRHJvcFRhcmdldCA9IGZ1bmN0aW9uKGVEcm9wVGFyZ2V0LCBkcm9wVGFyZ2V0Q2FsbGJhY2spIHtcclxuICAgIHZhciBtb3VzZUluID0gZmFsc2U7XHJcbiAgICB2YXIgYWNjZXB0RHJhZyA9IGZhbHNlO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGVEcm9wVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmICghbW91c2VJbikge1xyXG4gICAgICAgICAgICBtb3VzZUluID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoYXQuZHJhZ0l0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGFjY2VwdERyYWcgPSBkcm9wVGFyZ2V0Q2FsbGJhY2suYWNjZXB0RHJhZyh0aGF0LmRyYWdJdGVtKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFjY2VwdERyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGVEcm9wVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYgKGFjY2VwdERyYWcpIHtcclxuICAgICAgICAgICAgZHJvcFRhcmdldENhbGxiYWNrLm5vRHJvcCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb3VzZUluID0gZmFsc2U7XHJcbiAgICAgICAgYWNjZXB0RHJhZyA9IGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZURyb3BUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGRyYWdJdGVtIHNob3VsZCBuZXZlciBiZSBudWxsLCBjaGVja2luZyBqdXN0IGluIGNhc2VcclxuICAgICAgICBpZiAoYWNjZXB0RHJhZyAmJiB0aGF0LmRyYWdJdGVtKSB7XHJcbiAgICAgICAgICAgIGRyb3BUYXJnZXRDYWxsYmFjay5kcm9wKHRoYXQuZHJhZ0l0ZW0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IERyYWdBbmREcm9wU2VydmljZSgpOyIsImZ1bmN0aW9uIEV4cGFuZENyZWF0b3IoKSB7fVxyXG5cclxuRXhwYW5kQ3JlYXRvci5wcm90b3R5cGUuZ3JvdXAgPSBmdW5jdGlvbihyb3dOb2RlcywgZ3JvdXBCeUZpZWxkcywgZ3JvdXBBZ2dGdW5jdGlvbiwgZXhwYW5kQnlEZWZhdWx0KSB7XHJcbiAgICBjb25zb2xlLmxvZygnaSBhbSBpbicpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvd05vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgbm9kZSA9IHJvd05vZGVzW2ldO1xyXG4gICAgICAgIG5vZGUuZ3JvdXAgPSB0cnVlO1xyXG4gICAgICAgIG5vZGUuY2hpbGRyZW4gPSBbe1xyXG4gICAgICAgICAgICBmaXJzdDogdHJ1ZSxcclxuICAgICAgICAgICAgcGFyZW50OiBub2RlXHJcbiAgICAgICAgfV07XHJcbiAgICAgICAgaWYgKG5vZGUucm93cyl7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAxOyB5IDwgbm9kZS5yb3dzOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4ucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlyc3Q6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcm93Tm9kZXM7XHJcbn07XHJcblxyXG5FeHBhbmRDcmVhdG9yLnByb3RvdHlwZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZXhwYW5kQnlEZWZhdWx0LCBsZXZlbCkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBhbmRCeURlZmF1bHQgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgcmV0dXJuIGxldmVsIDwgZXhwYW5kQnlEZWZhdWx0O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZXhwYW5kQnlEZWZhdWx0ID09PSB0cnVlIHx8IGV4cGFuZEJ5RGVmYXVsdCA9PT0gJ3RydWUnO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgRXhwYW5kQ3JlYXRvcigpO1xyXG4iLCJmdW5jdGlvbiBFeHByZXNzaW9uU2VydmljZSgpIHt9XHJcblxyXG5FeHByZXNzaW9uU2VydmljZS5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihydWxlLCBwYXJhbXMpIHtcclxufTtcclxuXHJcbmZ1bmN0aW9uIEV4cHJlc3Npb25TZXJ2aWNlKCkge1xyXG4gICAgdGhpcy5leHByZXNzaW9uVG9GdW5jdGlvbkNhY2hlID0ge307XHJcbn1cclxuXHJcbkV4cHJlc3Npb25TZXJ2aWNlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uIChleHByZXNzaW9uLCBwYXJhbXMpIHtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHZhciBqYXZhU2NyaXB0RnVuY3Rpb24gPSB0aGlzLmNyZWF0ZUV4cHJlc3Npb25GdW5jdGlvbihleHByZXNzaW9uKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gamF2YVNjcmlwdEZ1bmN0aW9uKHBhcmFtcy52YWx1ZSwgcGFyYW1zLmNvbnRleHQsIHBhcmFtcy5ub2RlLFxyXG4gICAgICAgICAgICBwYXJhbXMuZGF0YSwgcGFyYW1zLmNvbERlZiwgcGFyYW1zLnJvd0luZGV4LCBwYXJhbXMuYXBpKTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vIHRoZSBleHByZXNzaW9uIGZhaWxlZCwgd2hpY2ggY2FuIGhhcHBlbiwgYXMgaXQncyB0aGUgY2xpZW50IHRoYXRcclxuICAgICAgICAvLyBwcm92aWRlcyB0aGUgZXhwcmVzc2lvbi4gc28gcHJpbnQgYSBuaWNlIG1lc3NhZ2VcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdQcm9jZXNzaW5nIG9mIHRoZSBleHByZXNzaW9uIGZhaWxlZCcpO1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0V4cHJlc3Npb24gPSAnICsgZXhwcmVzc2lvbik7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXhjZXB0aW9uID0gJyArIGUpO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59O1xyXG5cclxuRXhwcmVzc2lvblNlcnZpY2UucHJvdG90eXBlLmNyZWF0ZUV4cHJlc3Npb25GdW5jdGlvbiA9IGZ1bmN0aW9uIChleHByZXNzaW9uKSB7XHJcbiAgICAvLyBjaGVjayBjYWNoZSBmaXJzdFxyXG4gICAgaWYgKHRoaXMuZXhwcmVzc2lvblRvRnVuY3Rpb25DYWNoZVtleHByZXNzaW9uXSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmV4cHJlc3Npb25Ub0Z1bmN0aW9uQ2FjaGVbZXhwcmVzc2lvbl07XHJcbiAgICB9XHJcbiAgICAvLyBpZiBub3QgZm91bmQgaW4gY2FjaGUsIHJldHVybiB0aGUgZnVuY3Rpb25cclxuICAgIHZhciBmdW5jdGlvbkJvZHkgPSB0aGlzLmNyZWF0ZUZ1bmN0aW9uQm9keShleHByZXNzaW9uKTtcclxuICAgIHZhciB0aGVGdW5jdGlvbiA9IG5ldyBGdW5jdGlvbigneCwgY3R4LCBub2RlLCBkYXRhLCBjb2xEZWYsIHJvd0luZGV4LCBhcGknLCBmdW5jdGlvbkJvZHkpO1xyXG5cclxuICAgIC8vIHN0b3JlIGluIGNhY2hlXHJcbiAgICB0aGlzLmV4cHJlc3Npb25Ub0Z1bmN0aW9uQ2FjaGVbZXhwcmVzc2lvbl0gPSB0aGVGdW5jdGlvbjtcclxuXHJcbiAgICByZXR1cm4gdGhlRnVuY3Rpb247XHJcbn07XHJcblxyXG5FeHByZXNzaW9uU2VydmljZS5wcm90b3R5cGUuY3JlYXRlRnVuY3Rpb25Cb2R5ID0gZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcclxuICAgIC8vIGlmIHRoZSBleHByZXNzaW9uIGhhcyB0aGUgJ3JldHVybicgd29yZCBpbiBpdCwgdGhlbiB1c2UgYXMgaXMsXHJcbiAgICAvLyBpZiBub3QsIHRoZW4gd3JhcCBpdCB3aXRoIHJldHVybiBhbmQgJzsnIHRvIG1ha2UgYSBmdW5jdGlvblxyXG4gICAgaWYgKGV4cHJlc3Npb24uaW5kZXhPZigncmV0dXJuJykgPj0gMCkge1xyXG4gICAgICAgIHJldHVybiBleHByZXNzaW9uO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gJ3JldHVybiAnICsgZXhwcmVzc2lvbiArICc7JztcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXhwcmVzc2lvblNlcnZpY2U7XHJcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIFNldEZpbHRlciA9IHJlcXVpcmUoJy4vc2V0RmlsdGVyJyk7XHJcbnZhciBOdW1iZXJGaWx0ZXIgPSByZXF1aXJlKCcuL251bWJlckZpbHRlcicpO1xyXG52YXIgU3RyaW5nRmlsdGVyID0gcmVxdWlyZSgnLi90ZXh0RmlsdGVyJyk7XHJcblxyXG5mdW5jdGlvbiBGaWx0ZXJNYW5hZ2VyKCkge31cclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihncmlkLCBncmlkT3B0aW9uc1dyYXBwZXIsICRjb21waWxlLCAkc2NvcGUsIGV4cHJlc3Npb25TZXJ2aWNlLCBjb2x1bW5Nb2RlbCkge1xyXG4gICAgdGhpcy4kY29tcGlsZSA9ICRjb21waWxlO1xyXG4gICAgdGhpcy4kc2NvcGUgPSAkc2NvcGU7XHJcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcclxuICAgIHRoaXMuZ3JpZCA9IGdyaWQ7XHJcbiAgICB0aGlzLmFsbEZpbHRlcnMgPSB7fTtcclxuICAgIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UgPSBleHByZXNzaW9uU2VydmljZTtcclxuICAgIHRoaXMuY29sdW1uTW9kZWwgPSBjb2x1bW5Nb2RlbDtcclxufTtcclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLnNldEZpbHRlck1vZGVsID0gZnVuY3Rpb24obW9kZWwpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGlmIChtb2RlbCkge1xyXG4gICAgICAgIC8vIG1hcmsgdGhlIGZpbHRlcnMgYXMgd2Ugc2V0IHRoZW0sIHNvIGFueSBhY3RpdmUgZmlsdGVycyBsZWZ0IG92ZXIgd2Ugc3RvcFxyXG4gICAgICAgIHZhciBwcm9jZXNzZWRGaWVsZHMgPSBPYmplY3Qua2V5cyhtb2RlbCk7XHJcbiAgICAgICAgdXRpbHMuaXRlcmF0ZU9iamVjdCh0aGlzLmFsbEZpbHRlcnMsIGZ1bmN0aW9uKGtleSwgZmlsdGVyV3JhcHBlcikge1xyXG4gICAgICAgICAgICB2YXIgZmllbGQgPSBmaWx0ZXJXcmFwcGVyLmNvbHVtbi5jb2xEZWYuZmllbGQ7XHJcbiAgICAgICAgICAgIHV0aWxzLnJlbW92ZUZyb21BcnJheShwcm9jZXNzZWRGaWVsZHMsIGZpZWxkKTtcclxuICAgICAgICAgICAgaWYgKGZpZWxkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3TW9kZWwgPSBtb2RlbFtmaWVsZF07XHJcbiAgICAgICAgICAgICAgICB0aGF0LnNldE1vZGVsT25GaWx0ZXJXcmFwcGVyKGZpbHRlcldyYXBwZXIuZmlsdGVyLCBuZXdNb2RlbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIG5vIGZpZWxkIGZvdW5kIGZvciBjb2x1bW4gd2hpbGUgZG9pbmcgc2V0RmlsdGVyTW9kZWwnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIGF0IHRoaXMgcG9pbnQsIHByb2Nlc3NlZEZpZWxkcyBjb250YWlucyBkYXRhIGZvciB3aGljaCB3ZSBkb24ndCBoYXZlIGEgZmlsdGVyIHdvcmtpbmcgeWV0XHJcbiAgICAgICAgdXRpbHMuaXRlcmF0ZUFycmF5KHByb2Nlc3NlZEZpZWxkcywgZnVuY3Rpb24oZmllbGQpIHtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHRoYXQuY29sdW1uTW9kZWwuZ2V0Q29sdW1uKGZpZWxkKTtcclxuICAgICAgICAgICAgaWYgKCFjb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignV2FybmluZyBhZy1ncmlkIC0gbm8gY29sdW1uIGZvdW5kIGZvciBmaWVsZCAnICsgZmllbGQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBmaWx0ZXJXcmFwcGVyID0gdGhhdC5nZXRPckNyZWF0ZUZpbHRlcldyYXBwZXIoY29sdW1uKTtcclxuICAgICAgICAgICAgdGhhdC5zZXRNb2RlbE9uRmlsdGVyV3JhcHBlcihmaWx0ZXJXcmFwcGVyLmZpbHRlciwgbW9kZWxbZmllbGRdKTtcclxuICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdXRpbHMuaXRlcmF0ZU9iamVjdCh0aGlzLmFsbEZpbHRlcnMsIGZ1bmN0aW9uKGtleSwgZmlsdGVyV3JhcHBlcikge1xyXG4gICAgICAgICAgICB0aGF0LnNldE1vZGVsT25GaWx0ZXJXcmFwcGVyKGZpbHRlcldyYXBwZXIuZmlsdGVyLCBudWxsKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLnNldE1vZGVsT25GaWx0ZXJXcmFwcGVyID0gZnVuY3Rpb24oZmlsdGVyLCBuZXdNb2RlbCkge1xyXG4gICAgLy8gYmVjYXVzZSB1c2VyIGNhbiBwcm92aWRlIGZpbHRlcnMsIHdlIHByb3ZpZGUgdXNlZnVsIGVycm9yIGNoZWNraW5nIGFuZCBtZXNzYWdlc1xyXG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIuZ2V0QXBpICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdXYXJuaW5nIGFnLWdyaWQgLSBmaWx0ZXIgbWlzc2luZyBnZXRBcGkgbWV0aG9kLCB3aGljaCBpcyBuZWVkZWQgZm9yIGdldEZpbHRlck1vZGVsJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGZpbHRlckFwaSA9IGZpbHRlci5nZXRBcGkoKTtcclxuICAgIGlmICh0eXBlb2YgZmlsdGVyQXBpLnNldE1vZGVsICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdXYXJuaW5nIGFnLWdyaWQgLSBmaWx0ZXIgQVBJIG1pc3Npbmcgc2V0TW9kZWwgbWV0aG9kLCB3aGljaCBpcyBuZWVkZWQgZm9yIHNldEZpbHRlck1vZGVsJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgZmlsdGVyQXBpLnNldE1vZGVsKG5ld01vZGVsKTtcclxufTtcclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmdldEZpbHRlck1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICB1dGlscy5pdGVyYXRlT2JqZWN0KHRoaXMuYWxsRmlsdGVycywgZnVuY3Rpb24oa2V5LCBmaWx0ZXJXcmFwcGVyKSB7XHJcbiAgICAgICAgLy8gYmVjYXVzZSB1c2VyIGNhbiBwcm92aWRlIGZpbHRlcnMsIHdlIHByb3ZpZGUgdXNlZnVsIGVycm9yIGNoZWNraW5nIGFuZCBtZXNzYWdlc1xyXG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyV3JhcHBlci5maWx0ZXIuZ2V0QXBpICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignV2FybmluZyBhZy1ncmlkIC0gZmlsdGVyIG1pc3NpbmcgZ2V0QXBpIG1ldGhvZCwgd2hpY2ggaXMgbmVlZGVkIGZvciBnZXRGaWx0ZXJNb2RlbCcpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmaWx0ZXJBcGkgPSBmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRBcGkoKTtcclxuICAgICAgICBpZiAodHlwZW9mIGZpbHRlckFwaS5nZXRNb2RlbCAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIGZpbHRlciBBUEkgbWlzc2luZyBnZXRNb2RlbCBtZXRob2QsIHdoaWNoIGlzIG5lZWRlZCBmb3IgZ2V0RmlsdGVyTW9kZWwnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbW9kZWwgPSBmaWx0ZXJBcGkuZ2V0TW9kZWwoKTtcclxuICAgICAgICBpZiAobW9kZWwpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkID0gZmlsdGVyV3JhcHBlci5jb2x1bW4uY29sRGVmLmZpZWxkO1xyXG4gICAgICAgICAgICBpZiAoIWZpZWxkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIGNhbm5vdCBnZXQgZmlsdGVyIG1vZGVsIHdoZW4gbm8gZmllbGQgdmFsdWUgcHJlc2VudCBmb3IgY29sdW1uJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRbZmllbGRdID0gbW9kZWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRSb3dNb2RlbCA9IGZ1bmN0aW9uKHJvd01vZGVsKSB7XHJcbiAgICB0aGlzLnJvd01vZGVsID0gcm93TW9kZWw7XHJcbn07XHJcblxyXG4vLyByZXR1cm5zIHRydWUgaWYgYXQgbGVhc3Qgb25lIGZpbHRlciBpcyBhY3RpdmVcclxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuaXNGaWx0ZXJQcmVzZW50ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgYXRMZWFzdE9uZUFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5hbGxGaWx0ZXJzKTtcclxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICB2YXIgZmlsdGVyV3JhcHBlciA9IHRoYXQuYWxsRmlsdGVyc1trZXldO1xyXG4gICAgICAgIGlmICghZmlsdGVyV3JhcHBlci5maWx0ZXIuaXNGaWx0ZXJBY3RpdmUpIHsgLy8gYmVjYXVzZSB1c2VycyBjYW4gZG8gY3VzdG9tIGZpbHRlcnMsIGdpdmUgbmljZSBlcnJvciBtZXNzYWdlXHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZpbHRlciBpcyBtaXNzaW5nIG1ldGhvZCBpc0ZpbHRlckFjdGl2ZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZmlsdGVyV3JhcHBlci5maWx0ZXIuaXNGaWx0ZXJBY3RpdmUoKSkge1xyXG4gICAgICAgICAgICBhdExlYXN0T25lQWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBhdExlYXN0T25lQWN0aXZlO1xyXG59O1xyXG5cclxuLy8gcmV0dXJucyB0cnVlIGlmIGdpdmVuIGNvbCBoYXMgYSBmaWx0ZXIgYWN0aXZlXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmlzRmlsdGVyUHJlc2VudEZvckNvbCA9IGZ1bmN0aW9uKGNvbElkKSB7XHJcbiAgICB2YXIgZmlsdGVyV3JhcHBlciA9IHRoaXMuYWxsRmlsdGVyc1tjb2xJZF07XHJcbiAgICBpZiAoIWZpbHRlcldyYXBwZXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZiAoIWZpbHRlcldyYXBwZXIuZmlsdGVyLmlzRmlsdGVyQWN0aXZlKSB7IC8vIGJlY2F1c2UgdXNlcnMgY2FuIGRvIGN1c3RvbSBmaWx0ZXJzLCBnaXZlIG5pY2UgZXJyb3IgbWVzc2FnZVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZpbHRlciBpcyBtaXNzaW5nIG1ldGhvZCBpc0ZpbHRlckFjdGl2ZScpO1xyXG4gICAgfVxyXG4gICAgdmFyIGZpbHRlclByZXNlbnQgPSBmaWx0ZXJXcmFwcGVyLmZpbHRlci5pc0ZpbHRlckFjdGl2ZSgpO1xyXG4gICAgcmV0dXJuIGZpbHRlclByZXNlbnQ7XHJcbn07XHJcblxyXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5kb2VzRmlsdGVyUGFzcyA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciBkYXRhID0gbm9kZS5kYXRhO1xyXG4gICAgdmFyIGNvbEtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmFsbEZpbHRlcnMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjb2xLZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykgeyAvLyBjcml0aWNhbCBjb2RlLCBkb24ndCB1c2UgZnVuY3Rpb25hbCBwcm9ncmFtbWluZ1xyXG5cclxuICAgICAgICB2YXIgY29sSWQgPSBjb2xLZXlzW2ldO1xyXG4gICAgICAgIHZhciBmaWx0ZXJXcmFwcGVyID0gdGhpcy5hbGxGaWx0ZXJzW2NvbElkXTtcclxuXHJcbiAgICAgICAgLy8gaWYgbm8gZmlsdGVyLCBhbHdheXMgcGFzc1xyXG4gICAgICAgIGlmIChmaWx0ZXJXcmFwcGVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWZpbHRlcldyYXBwZXIuZmlsdGVyLmRvZXNGaWx0ZXJQYXNzKSB7IC8vIGJlY2F1c2UgdXNlcnMgY2FuIGRvIGN1c3RvbSBmaWx0ZXJzLCBnaXZlIG5pY2UgZXJyb3IgbWVzc2FnZVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGaWx0ZXIgaXMgbWlzc2luZyBtZXRob2QgZG9lc0ZpbHRlclBhc3MnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgZGF0YTogZGF0YVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgaWYgKCFmaWx0ZXJXcmFwcGVyLmZpbHRlci5kb2VzRmlsdGVyUGFzcyhwYXJhbXMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBhbGwgZmlsdGVycyBwYXNzZWRcclxuICAgIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUub25OZXdSb3dzTG9hZGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLmFsbEZpbHRlcnMpLmZvckVhY2goZnVuY3Rpb24oZmllbGQpIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhhdC5hbGxGaWx0ZXJzW2ZpZWxkXS5maWx0ZXI7XHJcbiAgICAgICAgaWYgKGZpbHRlci5vbk5ld1Jvd3NMb2FkZWQpIHtcclxuICAgICAgICAgICAgZmlsdGVyLm9uTmV3Um93c0xvYWRlZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUucG9zaXRpb25Qb3B1cCA9IGZ1bmN0aW9uKGV2ZW50U291cmNlLCBlUG9wdXAsIGVQb3B1cFJvb3QpIHtcclxuICAgIHZhciBzb3VyY2VSZWN0ID0gZXZlbnRTb3VyY2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICB2YXIgcGFyZW50UmVjdCA9IGVQb3B1cFJvb3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgdmFyIHggPSBzb3VyY2VSZWN0LmxlZnQgLSBwYXJlbnRSZWN0LmxlZnQ7XHJcbiAgICB2YXIgeSA9IHNvdXJjZVJlY3QudG9wIC0gcGFyZW50UmVjdC50b3AgKyBzb3VyY2VSZWN0LmhlaWdodDtcclxuXHJcbiAgICAvLyBpZiBwb3B1cCBpcyBvdmVyZmxvd2luZyB0byB0aGUgcmlnaHQsIG1vdmUgaXQgbGVmdFxyXG4gICAgdmFyIHdpZHRoT2ZQb3B1cCA9IDIwMDsgLy8gdGhpcyBpcyBzZXQgaW4gdGhlIGNzc1xyXG4gICAgdmFyIHdpZHRoT2ZQYXJlbnQgPSBwYXJlbnRSZWN0LnJpZ2h0IC0gcGFyZW50UmVjdC5sZWZ0O1xyXG4gICAgdmFyIG1heFggPSB3aWR0aE9mUGFyZW50IC0gd2lkdGhPZlBvcHVwIC0gMjA7IC8vIDIwIHBpeGVscyBncmFjZVxyXG4gICAgaWYgKHggPiBtYXhYKSB7IC8vIG1vdmUgcG9zaXRpb24gbGVmdCwgYmFjayBpbnRvIHZpZXdcclxuICAgICAgICB4ID0gbWF4WDtcclxuICAgIH1cclxuICAgIGlmICh4IDwgMCkgeyAvLyBpbiBjYXNlIHRoZSBwb3B1cCBoYXMgYSBuZWdhdGl2ZSB2YWx1ZVxyXG4gICAgICAgIHggPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGVQb3B1cC5zdHlsZS5sZWZ0ID0geCArIFwicHhcIjtcclxuICAgIGVQb3B1cC5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xyXG59O1xyXG5cclxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuY3JlYXRlVmFsdWVHZXR0ZXIgPSBmdW5jdGlvbihjb2xEZWYpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbiB2YWx1ZUdldHRlcihub2RlKSB7XHJcbiAgICAgICAgdmFyIGFwaSA9IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpO1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpO1xyXG4gICAgICAgIHJldHVybiB1dGlscy5nZXRWYWx1ZSh0aGF0LmV4cHJlc3Npb25TZXJ2aWNlLCBub2RlLmRhdGEsIGNvbERlZiwgbm9kZSwgYXBpLCBjb250ZXh0KTtcclxuICAgIH07XHJcbn07XHJcblxyXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5nZXRGaWx0ZXJBcGkgPSBmdW5jdGlvbihjb2x1bW4pIHtcclxuICAgIHZhciBmaWx0ZXJXcmFwcGVyID0gdGhpcy5nZXRPckNyZWF0ZUZpbHRlcldyYXBwZXIoY29sdW1uKTtcclxuICAgIGlmIChmaWx0ZXJXcmFwcGVyKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRBcGkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZpbHRlcldyYXBwZXIuZmlsdGVyLmdldEFwaSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmdldE9yQ3JlYXRlRmlsdGVyV3JhcHBlciA9IGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgdmFyIGZpbHRlcldyYXBwZXIgPSB0aGlzLmFsbEZpbHRlcnNbY29sdW1uLmNvbElkXTtcclxuXHJcbiAgICBpZiAoIWZpbHRlcldyYXBwZXIpIHtcclxuICAgICAgICBmaWx0ZXJXcmFwcGVyID0gdGhpcy5jcmVhdGVGaWx0ZXJXcmFwcGVyKGNvbHVtbik7XHJcbiAgICAgICAgdGhpcy5hbGxGaWx0ZXJzW2NvbHVtbi5jb2xJZF0gPSBmaWx0ZXJXcmFwcGVyO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmaWx0ZXJXcmFwcGVyO1xyXG59O1xyXG5cclxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuY3JlYXRlRmlsdGVyV3JhcHBlciA9IGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XHJcblxyXG4gICAgdmFyIGZpbHRlcldyYXBwZXIgPSB7XHJcbiAgICAgICAgY29sdW1uOiBjb2x1bW5cclxuICAgIH07XHJcbiAgICB2YXIgZmlsdGVyQ2hhbmdlZENhbGxiYWNrID0gdGhpcy5ncmlkLm9uRmlsdGVyQ2hhbmdlZC5iaW5kKHRoaXMuZ3JpZCk7XHJcbiAgICB2YXIgZmlsdGVyUGFyYW1zID0gY29sRGVmLmZpbHRlclBhcmFtcztcclxuICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgcm93TW9kZWw6IHRoaXMucm93TW9kZWwsXHJcbiAgICAgICAgZmlsdGVyQ2hhbmdlZENhbGxiYWNrOiBmaWx0ZXJDaGFuZ2VkQ2FsbGJhY2ssXHJcbiAgICAgICAgZmlsdGVyUGFyYW1zOiBmaWx0ZXJQYXJhbXMsXHJcbiAgICAgICAgbG9jYWxlVGV4dEZ1bmM6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldExvY2FsZVRleHRGdW5jKCksXHJcbiAgICAgICAgdmFsdWVHZXR0ZXI6IHRoaXMuY3JlYXRlVmFsdWVHZXR0ZXIoY29sRGVmKVxyXG4gICAgfTtcclxuICAgIGlmICh0eXBlb2YgY29sRGVmLmZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIC8vIGlmIHVzZXIgcHJvdmlkZWQgYSBmaWx0ZXIsIGp1c3QgdXNlIGl0XHJcbiAgICAgICAgLy8gZmlyc3QgdXAsIGNyZWF0ZSBjaGlsZCBzY29wZSBpZiBuZWVkZWRcclxuICAgICAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZUZpbHRlcnMoKSkge1xyXG4gICAgICAgICAgICB2YXIgc2NvcGUgPSB0aGlzLiRzY29wZS4kbmV3KCk7XHJcbiAgICAgICAgICAgIGZpbHRlcldyYXBwZXIuc2NvcGUgPSBzY29wZTtcclxuICAgICAgICAgICAgcGFyYW1zLiRzY29wZSA9IHNjb3BlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBub3cgY3JlYXRlIGZpbHRlclxyXG4gICAgICAgIGZpbHRlcldyYXBwZXIuZmlsdGVyID0gbmV3IGNvbERlZi5maWx0ZXIocGFyYW1zKTtcclxuICAgIH0gZWxzZSBpZiAoY29sRGVmLmZpbHRlciA9PT0gJ3RleHQnKSB7XHJcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIgPSBuZXcgU3RyaW5nRmlsdGVyKHBhcmFtcyk7XHJcbiAgICB9IGVsc2UgaWYgKGNvbERlZi5maWx0ZXIgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIgPSBuZXcgTnVtYmVyRmlsdGVyKHBhcmFtcyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZpbHRlcldyYXBwZXIuZmlsdGVyID0gbmV3IFNldEZpbHRlcihwYXJhbXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghZmlsdGVyV3JhcHBlci5maWx0ZXIuZ2V0R3VpKSB7IC8vIGJlY2F1c2UgdXNlcnMgY2FuIGRvIGN1c3RvbSBmaWx0ZXJzLCBnaXZlIG5pY2UgZXJyb3IgbWVzc2FnZVxyXG4gICAgICAgIHRocm93ICdGaWx0ZXIgaXMgbWlzc2luZyBtZXRob2QgZ2V0R3VpJztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZUZpbHRlckd1aSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZUZpbHRlckd1aS5jbGFzc05hbWUgPSAnYWctZmlsdGVyJztcclxuICAgIHZhciBndWlGcm9tRmlsdGVyID0gZmlsdGVyV3JhcHBlci5maWx0ZXIuZ2V0R3VpKCk7XHJcbiAgICBpZiAodXRpbHMuaXNOb2RlT3JFbGVtZW50KGd1aUZyb21GaWx0ZXIpKSB7XHJcbiAgICAgICAgLy9hIGRvbSBub2RlIG9yIGVsZW1lbnQgd2FzIHJldHVybmVkLCBzbyBhZGQgY2hpbGRcclxuICAgICAgICBlRmlsdGVyR3VpLmFwcGVuZENoaWxkKGd1aUZyb21GaWx0ZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvL290aGVyd2lzZSBhc3N1bWUgaXQgd2FzIGh0bWwsIHNvIGp1c3QgaW5zZXJ0XHJcbiAgICAgICAgdmFyIGVUZXh0U3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgICAgICBlVGV4dFNwYW4uaW5uZXJIVE1MID0gZ3VpRnJvbUZpbHRlcjtcclxuICAgICAgICBlRmlsdGVyR3VpLmFwcGVuZENoaWxkKGVUZXh0U3Bhbik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbHRlcldyYXBwZXIuc2NvcGUpIHtcclxuICAgICAgICBmaWx0ZXJXcmFwcGVyLmd1aSA9IHRoaXMuJGNvbXBpbGUoZUZpbHRlckd1aSkoZmlsdGVyV3JhcHBlci5zY29wZSlbMF07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZpbHRlcldyYXBwZXIuZ3VpID0gZUZpbHRlckd1aTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmlsdGVyV3JhcHBlcjtcclxufTtcclxuXHJcbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLnNob3dGaWx0ZXIgPSBmdW5jdGlvbihjb2x1bW4sIGV2ZW50U291cmNlKSB7XHJcblxyXG4gICAgdmFyIGZpbHRlcldyYXBwZXIgPSB0aGlzLmdldE9yQ3JlYXRlRmlsdGVyV3JhcHBlcihjb2x1bW4pO1xyXG5cclxuICAgIHZhciBlUG9wdXBQYXJlbnQgPSB0aGlzLmdyaWQuZ2V0UG9wdXBQYXJlbnQoKTtcclxuICAgIHRoaXMucG9zaXRpb25Qb3B1cChldmVudFNvdXJjZSwgZmlsdGVyV3JhcHBlci5ndWksIGVQb3B1cFBhcmVudCk7XHJcblxyXG4gICAgdXRpbHMuYWRkQXNNb2RhbFBvcHVwKGVQb3B1cFBhcmVudCwgZmlsdGVyV3JhcHBlci5ndWkpO1xyXG5cclxuICAgIGlmIChmaWx0ZXJXcmFwcGVyLmZpbHRlci5hZnRlckd1aUF0dGFjaGVkKSB7XHJcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIuYWZ0ZXJHdWlBdHRhY2hlZCgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJNYW5hZ2VyO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj48ZGl2PjxzZWxlY3QgY2xhc3M9YWctZmlsdGVyLXNlbGVjdCBpZD1maWx0ZXJUeXBlPjxvcHRpb24gdmFsdWU9MT5bRVFVQUxTXTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9Mj5bTEVTUyBUSEFOXTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9Mz5bR1JFQVRFUiBUSEFOXTwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxkaXY+PGlucHV0IGNsYXNzPWFnLWZpbHRlci1maWx0ZXIgaWQ9ZmlsdGVyVGV4dCB0eXBlPXRleHQgcGxhY2Vob2xkZXI9XFxcIltGSUxURVIuLi5dXFxcIj48L2Rpdj48L2Rpdj5cIjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcclxudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi9udW1iZXJGaWx0ZXIuaHRtbCcpO1xyXG5cclxudmFyIEVRVUFMUyA9IDE7XHJcbnZhciBMRVNTX1RIQU4gPSAyO1xyXG52YXIgR1JFQVRFUl9USEFOID0gMztcclxuXHJcbmZ1bmN0aW9uIE51bWJlckZpbHRlcihwYXJhbXMpIHtcclxuICAgIHRoaXMuZmlsdGVyUGFyYW1zID0gcGFyYW1zLmZpbHRlclBhcmFtcztcclxuICAgIHRoaXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrID0gcGFyYW1zLmZpbHRlckNoYW5nZWRDYWxsYmFjaztcclxuICAgIHRoaXMubG9jYWxlVGV4dEZ1bmMgPSBwYXJhbXMubG9jYWxlVGV4dEZ1bmM7XHJcbiAgICB0aGlzLnZhbHVlR2V0dGVyID0gcGFyYW1zLnZhbHVlR2V0dGVyO1xyXG4gICAgdGhpcy5jcmVhdGVHdWkoKTtcclxuICAgIHRoaXMuZmlsdGVyTnVtYmVyID0gbnVsbDtcclxuICAgIHRoaXMuZmlsdGVyVHlwZSA9IEVRVUFMUztcclxuICAgIHRoaXMuY3JlYXRlQXBpKCk7XHJcbn1cclxuXHJcbi8qIHB1YmxpYyAqL1xyXG5OdW1iZXJGaWx0ZXIucHJvdG90eXBlLm9uTmV3Um93c0xvYWRlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGtlZXBTZWxlY3Rpb24gPSB0aGlzLmZpbHRlclBhcmFtcyAmJiB0aGlzLmZpbHRlclBhcmFtcy5uZXdSb3dzQWN0aW9uID09PSAna2VlcCc7XHJcbiAgICBpZiAoIWtlZXBTZWxlY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmFwaS5zZXRUeXBlKEVRVUFMUyk7XHJcbiAgICAgICAgdGhpcy5hcGkuc2V0RmlsdGVyKG51bGwpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcbk51bWJlckZpbHRlci5wcm90b3R5cGUuYWZ0ZXJHdWlBdHRhY2hlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkLmZvY3VzKCk7XHJcbn07XHJcblxyXG4vKiBwdWJsaWMgKi9cclxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5kb2VzRmlsdGVyUGFzcyA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIGlmICh0aGlzLmZpbHRlck51bWJlciA9PT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZUdldHRlcihub2RlKTtcclxuXHJcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB2YWx1ZUFzTnVtYmVyO1xyXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICB2YWx1ZUFzTnVtYmVyID0gdmFsdWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhbHVlQXNOdW1iZXIgPSBwYXJzZUZsb2F0KHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHRoaXMuZmlsdGVyVHlwZSkge1xyXG4gICAgICAgIGNhc2UgRVFVQUxTOlxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVBc051bWJlciA9PT0gdGhpcy5maWx0ZXJOdW1iZXI7XHJcbiAgICAgICAgY2FzZSBMRVNTX1RIQU46XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUFzTnVtYmVyIDw9IHRoaXMuZmlsdGVyTnVtYmVyO1xyXG4gICAgICAgIGNhc2UgR1JFQVRFUl9USEFOOlxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVBc051bWJlciA+PSB0aGlzLmZpbHRlck51bWJlcjtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAvLyBzaG91bGQgbmV2ZXIgaGFwcGVuXHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignaW52YWxpZCBmaWx0ZXIgdHlwZSAnICsgdGhpcy5maWx0ZXJUeXBlKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcbk51bWJlckZpbHRlci5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lR3VpO1xyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcbk51bWJlckZpbHRlci5wcm90b3R5cGUuaXNGaWx0ZXJBY3RpdmUgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmZpbHRlck51bWJlciAhPT0gbnVsbDtcclxufTtcclxuXHJcbk51bWJlckZpbHRlci5wcm90b3R5cGUuY3JlYXRlVGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0ZW1wbGF0ZVxyXG4gICAgICAgIC5yZXBsYWNlKCdbRklMVEVSLi4uXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2ZpbHRlck9vbycsICdGaWx0ZXIuLi4nKSlcclxuICAgICAgICAucmVwbGFjZSgnW0VRVUFMU10nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdlcXVhbHMnLCAnRXF1YWxzJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tMRVNTIFRIQU5dJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnbGVzc1RoYW4nLCAnTGVzcyB0aGFuJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tHUkVBVEVSIFRIQU5dJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnZ3JlYXRlclRoYW4nLCAnR3JlYXRlciB0aGFuJykpO1xyXG59O1xyXG5cclxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5jcmVhdGVHdWkgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xyXG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCIjZmlsdGVyVGV4dFwiKTtcclxuICAgIHRoaXMuZVR5cGVTZWxlY3QgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcihcIiNmaWx0ZXJUeXBlXCIpO1xyXG5cclxuICAgIHV0aWxzLmFkZENoYW5nZUxpc3RlbmVyKHRoaXMuZUZpbHRlclRleHRGaWVsZCwgdGhpcy5vbkZpbHRlckNoYW5nZWQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLmVUeXBlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vblR5cGVDaGFuZ2VkLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5vblR5cGVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmZpbHRlclR5cGUgPSBwYXJzZUludCh0aGlzLmVUeXBlU2VsZWN0LnZhbHVlKTtcclxuICAgIHRoaXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrKCk7XHJcbn07XHJcblxyXG5OdW1iZXJGaWx0ZXIucHJvdG90eXBlLm9uRmlsdGVyQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGZpbHRlclRleHQgPSB1dGlscy5tYWtlTnVsbCh0aGlzLmVGaWx0ZXJUZXh0RmllbGQudmFsdWUpO1xyXG4gICAgaWYgKGZpbHRlclRleHQgJiYgZmlsdGVyVGV4dC50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgICAgZmlsdGVyVGV4dCA9IG51bGw7XHJcbiAgICB9XHJcbiAgICBpZiAoZmlsdGVyVGV4dCkge1xyXG4gICAgICAgIHRoaXMuZmlsdGVyTnVtYmVyID0gcGFyc2VGbG9hdChmaWx0ZXJUZXh0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5maWx0ZXJOdW1iZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2soKTtcclxufTtcclxuXHJcbk51bWJlckZpbHRlci5wcm90b3R5cGUuY3JlYXRlQXBpID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLmFwaSA9IHtcclxuICAgICAgICBFUVVBTFM6IEVRVUFMUyxcclxuICAgICAgICBMRVNTX1RIQU46IExFU1NfVEhBTixcclxuICAgICAgICBHUkVBVEVSX1RIQU46IEdSRUFURVJfVEhBTixcclxuICAgICAgICBzZXRUeXBlOiBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZmlsdGVyVHlwZSA9IHR5cGU7XHJcbiAgICAgICAgICAgIHRoYXQuZVR5cGVTZWxlY3QudmFsdWUgPSB0eXBlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0RmlsdGVyOiBmdW5jdGlvbihmaWx0ZXIpIHtcclxuICAgICAgICAgICAgZmlsdGVyID0gdXRpbHMubWFrZU51bGwoZmlsdGVyKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXIhPT1udWxsICYmICEodHlwZW9mIGZpbHRlciA9PT0gJ251bWJlcicpKSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXIgPSBwYXJzZUZsb2F0KGZpbHRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC5maWx0ZXJOdW1iZXIgPSBmaWx0ZXI7XHJcbiAgICAgICAgICAgIHRoYXQuZUZpbHRlclRleHRGaWVsZC52YWx1ZSA9IGZpbHRlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5maWx0ZXJUeXBlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RmlsdGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZmlsdGVyTnVtYmVyO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0TW9kZWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhhdC5pc0ZpbHRlckFjdGl2ZSgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRoYXQuZmlsdGVyVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHRoYXQuZmlsdGVyTnVtYmVyXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldE1vZGVsOiBmdW5jdGlvbihkYXRhTW9kZWwpIHtcclxuICAgICAgICAgICAgaWYgKGRhdGFNb2RlbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGRhdGFNb2RlbC50eXBlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RmlsdGVyKGRhdGFNb2RlbC5maWx0ZXIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGaWx0ZXIobnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59O1xyXG5cclxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmFwaTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyRmlsdGVyO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj48ZGl2IGNsYXNzPWFnLWZpbHRlci1oZWFkZXItY29udGFpbmVyPjxpbnB1dCBjbGFzcz1hZy1maWx0ZXItZmlsdGVyIHR5cGU9dGV4dCBwbGFjZWhvbGRlcj1cXFwiW1NFQVJDSC4uLl1cXFwiPjwvZGl2PjxkaXYgY2xhc3M9YWctZmlsdGVyLWhlYWRlci1jb250YWluZXI+PGxhYmVsPjxpbnB1dCBpZD1zZWxlY3RBbGwgdHlwZT1jaGVja2JveCBjbGFzcz1cXFwiYWctZmlsdGVyLWNoZWNrYm94XFxcIj4gKFtTRUxFQ1QgQUxMXSk8L2xhYmVsPjwvZGl2PjxkaXYgY2xhc3M9YWctZmlsdGVyLWxpc3Qtdmlld3BvcnQ+PGRpdiBjbGFzcz1hZy1maWx0ZXItbGlzdC1jb250YWluZXI+PGRpdiBpZD1pdGVtRm9yUmVwZWF0IGNsYXNzPWFnLWZpbHRlci1pdGVtPjxsYWJlbD48aW5wdXQgdHlwZT1jaGVja2JveCBjbGFzcz1hZy1maWx0ZXItY2hlY2tib3ggZmlsdGVyLWNoZWNrYm94PVxcXCJ0cnVlXFxcIj4gPHNwYW4gY2xhc3M9YWctZmlsdGVyLXZhbHVlPjwvc3Bhbj48L2xhYmVsPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PlwiO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG52YXIgU2V0RmlsdGVyTW9kZWwgPSByZXF1aXJlKCcuL3NldEZpbHRlck1vZGVsJyk7XHJcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vc2V0RmlsdGVyLmh0bWwnKTtcclxuXHJcbnZhciBERUZBVUxUX1JPV19IRUlHSFQgPSAyMDtcclxuXHJcbmZ1bmN0aW9uIFNldEZpbHRlcihwYXJhbXMpIHtcclxuICAgIHRoaXMuZmlsdGVyUGFyYW1zID0gcGFyYW1zLmZpbHRlclBhcmFtcztcclxuICAgIHRoaXMucm93SGVpZ2h0ID0gKHRoaXMuZmlsdGVyUGFyYW1zICYmIHRoaXMuZmlsdGVyUGFyYW1zLmNlbGxIZWlnaHQpID8gdGhpcy5maWx0ZXJQYXJhbXMuY2VsbEhlaWdodCA6IERFRkFVTFRfUk9XX0hFSUdIVDtcclxuICAgIHRoaXMubW9kZWwgPSBuZXcgU2V0RmlsdGVyTW9kZWwocGFyYW1zLmNvbERlZiwgcGFyYW1zLnJvd01vZGVsLCBwYXJhbXMudmFsdWVHZXR0ZXIpO1xyXG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2sgPSBwYXJhbXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrO1xyXG4gICAgdGhpcy52YWx1ZUdldHRlciA9IHBhcmFtcy52YWx1ZUdldHRlcjtcclxuICAgIHRoaXMucm93c0luQm9keUNvbnRhaW5lciA9IHt9O1xyXG4gICAgdGhpcy5jb2xEZWYgPSBwYXJhbXMuY29sRGVmO1xyXG4gICAgdGhpcy5sb2NhbGVUZXh0RnVuYyA9IHBhcmFtcy5sb2NhbGVUZXh0RnVuYztcclxuICAgIGlmICh0aGlzLmZpbHRlclBhcmFtcykge1xyXG4gICAgICAgIHRoaXMuY2VsbFJlbmRlcmVyID0gdGhpcy5maWx0ZXJQYXJhbXMuY2VsbFJlbmRlcmVyO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jcmVhdGVHdWkoKTtcclxuICAgIHRoaXMuYWRkU2Nyb2xsTGlzdGVuZXIoKTtcclxuICAgIHRoaXMuY3JlYXRlQXBpKCk7XHJcbn1cclxuXHJcbi8vIHdlIG5lZWQgdG8gaGF2ZSB0aGUgZ3VpIGF0dGFjaGVkIGJlZm9yZSB3ZSBjYW4gZHJhdyB0aGUgdmlydHVhbCByb3dzLCBhcyB0aGVcclxuLy8gdmlydHVhbCByb3cgbG9naWMgbmVlZHMgaW5mbyBhYm91dCB0aGUgZ3VpIHN0YXRlXHJcbi8qIHB1YmxpYyAqL1xyXG5TZXRGaWx0ZXIucHJvdG90eXBlLmFmdGVyR3VpQXR0YWNoZWQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZHJhd1ZpcnR1YWxSb3dzKCk7XHJcbn07XHJcblxyXG4vKiBwdWJsaWMgKi9cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5pc0ZpbHRlckFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMubW9kZWwuaXNGaWx0ZXJBY3RpdmUoKTtcclxufTtcclxuXHJcbi8qIHB1YmxpYyAqL1xyXG5TZXRGaWx0ZXIucHJvdG90eXBlLmRvZXNGaWx0ZXJQYXNzID0gZnVuY3Rpb24obm9kZSkge1xyXG5cclxuICAgIC8vaWYgbm8gZmlsdGVyLCBhbHdheXMgcGFzc1xyXG4gICAgaWYgKHRoaXMubW9kZWwuaXNFdmVyeXRoaW5nU2VsZWN0ZWQoKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy9pZiBub3RoaW5nIHNlbGVjdGVkIGluIGZpbHRlciwgYWx3YXlzIGZhaWxcclxuICAgIGlmICh0aGlzLm1vZGVsLmlzTm90aGluZ1NlbGVjdGVkKCkpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZUdldHRlcihub2RlKTtcclxuICAgIHZhbHVlID0gdXRpbHMubWFrZU51bGwodmFsdWUpO1xyXG5cclxuICAgIHZhciBmaWx0ZXJQYXNzZWQgPSB0aGlzLm1vZGVsLmlzVmFsdWVTZWxlY3RlZCh2YWx1ZSk7XHJcbiAgICByZXR1cm4gZmlsdGVyUGFzc2VkO1xyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcblNldEZpbHRlci5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lR3VpO1xyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcblNldEZpbHRlci5wcm90b3R5cGUub25OZXdSb3dzTG9hZGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIga2VlcFNlbGVjdGlvbiA9IHRoaXMuZmlsdGVyUGFyYW1zICYmIHRoaXMuZmlsdGVyUGFyYW1zLm5ld1Jvd3NBY3Rpb24gPT09ICdrZWVwJztcclxuICAgIC8vIGRlZmF1bHQgaXMgcmVzZXRcclxuICAgIHRoaXMubW9kZWwucmVmcmVzaFVuaXF1ZVZhbHVlcyhrZWVwU2VsZWN0aW9uKTtcclxuICAgIHRoaXMuc2V0Q29udGFpbmVySGVpZ2h0KCk7XHJcbiAgICB0aGlzLnJlZnJlc2hWaXJ0dWFsUm93cygpO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5jcmVhdGVUZW1wbGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRlbXBsYXRlXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tTRUxFQ1QgQUxMXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ3NlbGVjdEFsbCcsICdTZWxlY3QgQWxsJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tTRUFSQ0guLi5dJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnc2VhcmNoT29vJywgJ1NlYXJjaC4uLicpKTtcclxufTtcclxuXHJcblNldEZpbHRlci5wcm90b3R5cGUuY3JlYXRlR3VpID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xyXG5cclxuICAgIHRoaXMuZUxpc3RDb250YWluZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcihcIi5hZy1maWx0ZXItbGlzdC1jb250YWluZXJcIik7XHJcbiAgICB0aGlzLmVGaWx0ZXJWYWx1ZVRlbXBsYXRlID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCIjaXRlbUZvclJlcGVhdFwiKTtcclxuICAgIHRoaXMuZVNlbGVjdEFsbCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI3NlbGVjdEFsbFwiKTtcclxuICAgIHRoaXMuZUxpc3RWaWV3cG9ydCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiLmFnLWZpbHRlci1saXN0LXZpZXdwb3J0XCIpO1xyXG4gICAgdGhpcy5lTWluaUZpbHRlciA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiLmFnLWZpbHRlci1maWx0ZXJcIik7XHJcbiAgICB0aGlzLmVMaXN0Q29udGFpbmVyLnN0eWxlLmhlaWdodCA9ICh0aGlzLm1vZGVsLmdldFVuaXF1ZVZhbHVlQ291bnQoKSAqIHRoaXMucm93SGVpZ2h0KSArIFwicHhcIjtcclxuXHJcbiAgICB0aGlzLnNldENvbnRhaW5lckhlaWdodCgpO1xyXG4gICAgdGhpcy5lTWluaUZpbHRlci52YWx1ZSA9IHRoaXMubW9kZWwuZ2V0TWluaUZpbHRlcigpO1xyXG4gICAgdXRpbHMuYWRkQ2hhbmdlTGlzdGVuZXIodGhpcy5lTWluaUZpbHRlciwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgX3RoaXMub25NaW5pRmlsdGVyQ2hhbmdlZCgpO1xyXG4gICAgfSk7XHJcbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVMaXN0Q29udGFpbmVyKTtcclxuXHJcbiAgICB0aGlzLmVTZWxlY3RBbGwub25jbGljayA9IHRoaXMub25TZWxlY3RBbGwuYmluZCh0aGlzKTtcclxuXHJcbiAgICBpZiAodGhpcy5tb2RlbC5pc0V2ZXJ5dGhpbmdTZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmVTZWxlY3RBbGwuY2hlY2tlZCA9IHRydWU7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMubW9kZWwuaXNOb3RoaW5nU2VsZWN0ZWQoKSkge1xyXG4gICAgICAgIHRoaXMuZVNlbGVjdEFsbC5pbmRldGVybWluYXRlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmNoZWNrZWQgPSBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5zZXRDb250YWluZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZUxpc3RDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gKHRoaXMubW9kZWwuZ2V0RGlzcGxheWVkVmFsdWVDb3VudCgpICogdGhpcy5yb3dIZWlnaHQpICsgXCJweFwiO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5kcmF3VmlydHVhbFJvd3MgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0b3BQaXhlbCA9IHRoaXMuZUxpc3RWaWV3cG9ydC5zY3JvbGxUb3A7XHJcbiAgICB2YXIgYm90dG9tUGl4ZWwgPSB0b3BQaXhlbCArIHRoaXMuZUxpc3RWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XHJcblxyXG4gICAgdmFyIGZpcnN0Um93ID0gTWF0aC5mbG9vcih0b3BQaXhlbCAvIHRoaXMucm93SGVpZ2h0KTtcclxuICAgIHZhciBsYXN0Um93ID0gTWF0aC5mbG9vcihib3R0b21QaXhlbCAvIHRoaXMucm93SGVpZ2h0KTtcclxuXHJcbiAgICB0aGlzLmVuc3VyZVJvd3NSZW5kZXJlZChmaXJzdFJvdywgbGFzdFJvdyk7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXIucHJvdG90eXBlLmVuc3VyZVJvd3NSZW5kZXJlZCA9IGZ1bmN0aW9uKHN0YXJ0LCBmaW5pc2gpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgLy9hdCB0aGUgZW5kLCB0aGlzIGFycmF5IHdpbGwgY29udGFpbiB0aGUgaXRlbXMgd2UgbmVlZCB0byByZW1vdmVcclxuICAgIHZhciByb3dzVG9SZW1vdmUgPSBPYmplY3Qua2V5cyh0aGlzLnJvd3NJbkJvZHlDb250YWluZXIpO1xyXG5cclxuICAgIC8vYWRkIGluIG5ldyByb3dzXHJcbiAgICBmb3IgKHZhciByb3dJbmRleCA9IHN0YXJ0OyByb3dJbmRleCA8PSBmaW5pc2g7IHJvd0luZGV4KyspIHtcclxuICAgICAgICAvL3NlZSBpZiBpdGVtIGFscmVhZHkgdGhlcmUsIGFuZCBpZiB5ZXMsIHRha2UgaXQgb3V0IG9mIHRoZSAndG8gcmVtb3ZlJyBhcnJheVxyXG4gICAgICAgIGlmIChyb3dzVG9SZW1vdmUuaW5kZXhPZihyb3dJbmRleC50b1N0cmluZygpKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHJvd3NUb1JlbW92ZS5zcGxpY2Uocm93c1RvUmVtb3ZlLmluZGV4T2Yocm93SW5kZXgudG9TdHJpbmcoKSksIDEpO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy9jaGVjayB0aGlzIHJvdyBhY3R1YWxseSBleGlzdHMgKGluIGNhc2Ugb3ZlcmZsb3cgYnVmZmVyIHdpbmRvdyBleGNlZWRzIHJlYWwgZGF0YSlcclxuICAgICAgICBpZiAodGhpcy5tb2RlbC5nZXREaXNwbGF5ZWRWYWx1ZUNvdW50KCkgPiByb3dJbmRleCkge1xyXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLm1vZGVsLmdldERpc3BsYXllZFZhbHVlKHJvd0luZGV4KTtcclxuICAgICAgICAgICAgX3RoaXMuaW5zZXJ0Um93KHZhbHVlLCByb3dJbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vYXQgdGhpcyBwb2ludCwgZXZlcnl0aGluZyBpbiBvdXIgJ3Jvd3NUb1JlbW92ZScgLiAuIC5cclxuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlKTtcclxufTtcclxuXHJcbi8vdGFrZXMgYXJyYXkgb2Ygcm93IGlkJ3NcclxuU2V0RmlsdGVyLnByb3RvdHlwZS5yZW1vdmVWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKHJvd3NUb1JlbW92ZSkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIHJvd3NUb1JlbW92ZS5mb3JFYWNoKGZ1bmN0aW9uKGluZGV4VG9SZW1vdmUpIHtcclxuICAgICAgICB2YXIgZVJvd1RvUmVtb3ZlID0gX3RoaXMucm93c0luQm9keUNvbnRhaW5lcltpbmRleFRvUmVtb3ZlXTtcclxuICAgICAgICBfdGhpcy5lTGlzdENvbnRhaW5lci5yZW1vdmVDaGlsZChlUm93VG9SZW1vdmUpO1xyXG4gICAgICAgIGRlbGV0ZSBfdGhpcy5yb3dzSW5Cb2R5Q29udGFpbmVyW2luZGV4VG9SZW1vdmVdO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXIucHJvdG90eXBlLmluc2VydFJvdyA9IGZ1bmN0aW9uKHZhbHVlLCByb3dJbmRleCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICB2YXIgZUZpbHRlclZhbHVlID0gdGhpcy5lRmlsdGVyVmFsdWVUZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XHJcblxyXG4gICAgdmFyIHZhbHVlRWxlbWVudCA9IGVGaWx0ZXJWYWx1ZS5xdWVyeVNlbGVjdG9yKFwiLmFnLWZpbHRlci12YWx1ZVwiKTtcclxuICAgIGlmICh0aGlzLmNlbGxSZW5kZXJlcikge1xyXG4gICAgICAgIC8vcmVuZGVyZXIgcHJvdmlkZWQsIHNvIHVzZSBpdFxyXG4gICAgICAgIHZhciByZXN1bHRGcm9tUmVuZGVyZXIgPSB0aGlzLmNlbGxSZW5kZXJlcih7XHJcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodXRpbHMuaXNOb2RlKHJlc3VsdEZyb21SZW5kZXJlcikpIHtcclxuICAgICAgICAgICAgLy9hIGRvbSBub2RlIG9yIGVsZW1lbnQgd2FzIHJldHVybmVkLCBzbyBhZGQgY2hpbGRcclxuICAgICAgICAgICAgdmFsdWVFbGVtZW50LmFwcGVuZENoaWxkKHJlc3VsdEZyb21SZW5kZXJlcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy9vdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxyXG4gICAgICAgICAgICB2YWx1ZUVsZW1lbnQuaW5uZXJIVE1MID0gcmVzdWx0RnJvbVJlbmRlcmVyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vb3RoZXJ3aXNlIGRpc3BsYXkgYXMgYSBzdHJpbmdcclxuICAgICAgICB2YXIgYmxhbmtzVGV4dCA9ICcoJyArIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2JsYW5rcycsICdCbGFua3MnKSArICcpJztcclxuICAgICAgICB2YXIgZGlzcGxheU5hbWVPZlZhbHVlID0gdmFsdWUgPT09IG51bGwgPyBibGFua3NUZXh0IDogdmFsdWU7XHJcbiAgICAgICAgdmFsdWVFbGVtZW50LmlubmVySFRNTCA9IGRpc3BsYXlOYW1lT2ZWYWx1ZTtcclxuICAgIH1cclxuICAgIHZhciBlQ2hlY2tib3ggPSBlRmlsdGVyVmFsdWUucXVlcnlTZWxlY3RvcihcImlucHV0XCIpO1xyXG4gICAgZUNoZWNrYm94LmNoZWNrZWQgPSB0aGlzLm1vZGVsLmlzVmFsdWVTZWxlY3RlZCh2YWx1ZSk7XHJcblxyXG4gICAgZUNoZWNrYm94Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBfdGhpcy5vbkNoZWNrYm94Q2xpY2tlZChlQ2hlY2tib3gsIHZhbHVlKTtcclxuICAgIH07XHJcblxyXG4gICAgZUZpbHRlclZhbHVlLnN0eWxlLnRvcCA9ICh0aGlzLnJvd0hlaWdodCAqIHJvd0luZGV4KSArIFwicHhcIjtcclxuXHJcbiAgICB0aGlzLmVMaXN0Q29udGFpbmVyLmFwcGVuZENoaWxkKGVGaWx0ZXJWYWx1ZSk7XHJcbiAgICB0aGlzLnJvd3NJbkJvZHlDb250YWluZXJbcm93SW5kZXhdID0gZUZpbHRlclZhbHVlO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5vbkNoZWNrYm94Q2xpY2tlZCA9IGZ1bmN0aW9uKGVDaGVja2JveCwgdmFsdWUpIHtcclxuICAgIHZhciBjaGVja2VkID0gZUNoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICBpZiAoY2hlY2tlZCkge1xyXG4gICAgICAgIHRoaXMubW9kZWwuc2VsZWN0VmFsdWUodmFsdWUpO1xyXG4gICAgICAgIGlmICh0aGlzLm1vZGVsLmlzRXZlcnl0aGluZ1NlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZVNlbGVjdEFsbC5pbmRldGVybWluYXRlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubW9kZWwudW5zZWxlY3RWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgICAgLy9pZiBzZXQgaXMgZW1wdHksIG5vdGhpbmcgaXMgc2VsZWN0ZWRcclxuICAgICAgICBpZiAodGhpcy5tb2RlbC5pc05vdGhpbmdTZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZVNlbGVjdEFsbC5pbmRldGVybWluYXRlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuZVNlbGVjdEFsbC5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5vbk1pbmlGaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgbWluaUZpbHRlckNoYW5nZWQgPSB0aGlzLm1vZGVsLnNldE1pbmlGaWx0ZXIodGhpcy5lTWluaUZpbHRlci52YWx1ZSk7XHJcbiAgICBpZiAobWluaUZpbHRlckNoYW5nZWQpIHtcclxuICAgICAgICB0aGlzLnNldENvbnRhaW5lckhlaWdodCgpO1xyXG4gICAgICAgIHRoaXMucmVmcmVzaFZpcnR1YWxSb3dzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TZXRGaWx0ZXIucHJvdG90eXBlLnJlZnJlc2hWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5jbGVhclZpcnR1YWxSb3dzKCk7XHJcbiAgICB0aGlzLmRyYXdWaXJ0dWFsUm93cygpO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyLnByb3RvdHlwZS5jbGVhclZpcnR1YWxSb3dzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgcm93c1RvUmVtb3ZlID0gT2JqZWN0LmtleXModGhpcy5yb3dzSW5Cb2R5Q29udGFpbmVyKTtcclxuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlKTtcclxufTtcclxuXHJcblNldEZpbHRlci5wcm90b3R5cGUub25TZWxlY3RBbGwgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBjaGVja2VkID0gdGhpcy5lU2VsZWN0QWxsLmNoZWNrZWQ7XHJcbiAgICBpZiAoY2hlY2tlZCkge1xyXG4gICAgICAgIHRoaXMubW9kZWwuc2VsZWN0RXZlcnl0aGluZygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLm1vZGVsLnNlbGVjdE5vdGhpbmcoKTtcclxuICAgIH1cclxuICAgIHRoaXMudXBkYXRlQWxsQ2hlY2tib3hlcyhjaGVja2VkKTtcclxuICAgIHRoaXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrKCk7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXIucHJvdG90eXBlLnVwZGF0ZUFsbENoZWNrYm94ZXMgPSBmdW5jdGlvbihjaGVja2VkKSB7XHJcbiAgICB2YXIgY3VycmVudGx5RGlzcGxheWVkQ2hlY2tib3hlcyA9IHRoaXMuZUxpc3RDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcIltmaWx0ZXItY2hlY2tib3g9dHJ1ZV1cIik7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGN1cnJlbnRseURpc3BsYXllZENoZWNrYm94ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgY3VycmVudGx5RGlzcGxheWVkQ2hlY2tib3hlc1tpXS5jaGVja2VkID0gY2hlY2tlZDtcclxuICAgIH1cclxufTtcclxuXHJcblNldEZpbHRlci5wcm90b3R5cGUuYWRkU2Nyb2xsTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy5lTGlzdFZpZXdwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgX3RoaXMuZHJhd1ZpcnR1YWxSb3dzKCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcblNldEZpbHRlci5wcm90b3R5cGUuZ2V0QXBpID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5hcGk7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUFwaSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIG1vZGVsID0gdGhpcy5tb2RlbDtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuYXBpID0ge1xyXG4gICAgICAgIHNldE1pbmlGaWx0ZXI6IGZ1bmN0aW9uKG5ld01pbmlGaWx0ZXIpIHtcclxuICAgICAgICAgICAgbW9kZWwuc2V0TWluaUZpbHRlcihuZXdNaW5pRmlsdGVyKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE1pbmlGaWx0ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbW9kZWwuZ2V0TWluaUZpbHRlcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2VsZWN0RXZlcnl0aGluZzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIG1vZGVsLnNlbGVjdEV2ZXJ5dGhpbmcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzRmlsdGVyQWN0aXZlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmlzRmlsdGVyQWN0aXZlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWxlY3ROb3RoaW5nOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgbW9kZWwuc2VsZWN0Tm90aGluZygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdW5zZWxlY3RWYWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgICAgbW9kZWwudW5zZWxlY3RWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgIHRoYXQucmVmcmVzaFZpcnR1YWxSb3dzKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWxlY3RWYWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICAgICAgbW9kZWwuc2VsZWN0VmFsdWUodmFsdWUpO1xyXG4gICAgICAgICAgICB0aGF0LnJlZnJlc2hWaXJ0dWFsUm93cygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNWYWx1ZVNlbGVjdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbW9kZWwuaXNWYWx1ZVNlbGVjdGVkKHZhbHVlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzRXZlcnl0aGluZ1NlbGVjdGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmlzRXZlcnl0aGluZ1NlbGVjdGVkKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc05vdGhpbmdTZWxlY3RlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5pc05vdGhpbmdTZWxlY3RlZCgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VW5pcXVlVmFsdWVDb3VudDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5nZXRVbmlxdWVWYWx1ZUNvdW50KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRVbmlxdWVWYWx1ZTogZnVuY3Rpb24oaW5kZXgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmdldFVuaXF1ZVZhbHVlKGluZGV4KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmdldE1vZGVsKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRNb2RlbDogZnVuY3Rpb24oZGF0YU1vZGVsKSB7XHJcbiAgICAgICAgICAgIG1vZGVsLnNldE1vZGVsKGRhdGFNb2RlbCk7XHJcbiAgICAgICAgICAgIHRoYXQucmVmcmVzaFZpcnR1YWxSb3dzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2V0RmlsdGVyO1xyXG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gU2V0RmlsdGVyTW9kZWwoY29sRGVmLCByb3dNb2RlbCwgdmFsdWVHZXR0ZXIpIHtcclxuICAgIHRoaXMuY29sRGVmID0gY29sRGVmO1xyXG4gICAgdGhpcy5yb3dNb2RlbCA9IHJvd01vZGVsO1xyXG4gICAgdGhpcy52YWx1ZUdldHRlciA9IHZhbHVlR2V0dGVyO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlVW5pcXVlVmFsdWVzKCk7XHJcblxyXG4gICAgLy8gYnkgZGVmYXVsdCwgbm8gZmlsdGVyLCBzbyB3ZSBkaXNwbGF5IGV2ZXJ5dGhpbmdcclxuICAgIHRoaXMuZGlzcGxheWVkVmFsdWVzID0gdGhpcy51bmlxdWVWYWx1ZXM7XHJcbiAgICB0aGlzLm1pbmlGaWx0ZXIgPSBudWxsO1xyXG4gICAgLy93ZSB1c2UgYSBtYXAgcmF0aGVyIHRoYW4gYW4gYXJyYXkgZm9yIHRoZSBzZWxlY3RlZCB2YWx1ZXMgYXMgdGhlIGxvb2t1cFxyXG4gICAgLy9mb3IgYSBtYXAgaXMgbXVjaCBmYXN0ZXIgdGhhbiB0aGUgbG9va3VwIGZvciBhbiBhcnJheSwgZXNwZWNpYWxseSB3aGVuXHJcbiAgICAvL3RoZSBsZW5ndGggb2YgdGhlIGFycmF5IGlzIHRob3VzYW5kcyBvZiByZWNvcmRzIGxvbmdcclxuICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXAgPSB7fTtcclxuICAgIHRoaXMuc2VsZWN0RXZlcnl0aGluZygpO1xyXG59XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUucmVmcmVzaFVuaXF1ZVZhbHVlcyA9IGZ1bmN0aW9uKGtlZXBTZWxlY3Rpb24pIHtcclxuICAgIHRoaXMuY3JlYXRlVW5pcXVlVmFsdWVzKCk7XHJcblxyXG4gICAgdmFyIG9sZE1vZGVsID0gT2JqZWN0LmtleXModGhpcy5zZWxlY3RlZFZhbHVlc01hcCk7XHJcblxyXG4gICAgdGhpcy5zZWxlY3RlZFZhbHVlc01hcCA9IHt9O1xyXG4gICAgdGhpcy5maWx0ZXJEaXNwbGF5ZWRWYWx1ZXMoKTtcclxuXHJcbiAgICBpZiAoa2VlcFNlbGVjdGlvbikge1xyXG4gICAgICAgIHRoaXMuc2V0TW9kZWwob2xkTW9kZWwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnNlbGVjdEV2ZXJ5dGhpbmcoKTtcclxuICAgIH1cclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5jcmVhdGVVbmlxdWVWYWx1ZXMgPSBmdW5jdGlvbigpIHtcclxuICAgIGlmICh0aGlzLmNvbERlZi5maWx0ZXJQYXJhbXMgJiYgdGhpcy5jb2xEZWYuZmlsdGVyUGFyYW1zLnZhbHVlcykge1xyXG4gICAgICAgIHRoaXMudW5pcXVlVmFsdWVzID0gdXRpbHMudG9TdHJpbmdzKHRoaXMuY29sRGVmLmZpbHRlclBhcmFtcy52YWx1ZXMpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnVuaXF1ZVZhbHVlcyA9IHV0aWxzLnRvU3RyaW5ncyh0aGlzLml0ZXJhdGVUaHJvdWdoTm9kZXNGb3JWYWx1ZXMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuY29sRGVmLmNvbXBhcmF0b3IpIHtcclxuICAgICAgICB0aGlzLnVuaXF1ZVZhbHVlcy5zb3J0KHRoaXMuY29sRGVmLmNvbXBhcmF0b3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnVuaXF1ZVZhbHVlcy5zb3J0KHV0aWxzLmRlZmF1bHRDb21wYXJhdG9yKTtcclxuICAgIH1cclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5pdGVyYXRlVGhyb3VnaE5vZGVzRm9yVmFsdWVzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdW5pcXVlQ2hlY2sgPSB7fTtcclxuICAgIHZhciByZXN1bHQgPSBbXTtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgZnVuY3Rpb24gcmVjdXJzaXZlbHlQcm9jZXNzKG5vZGVzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICAgICAgICBpZiAobm9kZS5ncm91cCAmJiAhbm9kZS5mb290ZXIpIHtcclxuICAgICAgICAgICAgICAgIC8vIGdyb3VwIG5vZGUsIHNvIGRpZyBkZWVwZXJcclxuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZWx5UHJvY2Vzcyhub2RlLmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoYXQudmFsdWVHZXR0ZXIobm9kZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IFwiXCIgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghdW5pcXVlQ2hlY2suaGFzT3duUHJvcGVydHkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHVuaXF1ZUNoZWNrW3ZhbHVlXSA9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRvcExldmVsTm9kZXMgPSB0aGlzLnJvd01vZGVsLmdldFRvcExldmVsTm9kZXMoKTtcclxuICAgIHJlY3Vyc2l2ZWx5UHJvY2Vzcyh0b3BMZXZlbE5vZGVzKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuLy9zZXRzIG1pbmkgZmlsdGVyLiByZXR1cm5zIHRydWUgaWYgaXQgY2hhbmdlZCBmcm9tIGxhc3QgdmFsdWUsIG90aGVyd2lzZSBmYWxzZVxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuc2V0TWluaUZpbHRlciA9IGZ1bmN0aW9uKG5ld01pbmlGaWx0ZXIpIHtcclxuICAgIG5ld01pbmlGaWx0ZXIgPSB1dGlscy5tYWtlTnVsbChuZXdNaW5pRmlsdGVyKTtcclxuICAgIGlmICh0aGlzLm1pbmlGaWx0ZXIgPT09IG5ld01pbmlGaWx0ZXIpIHtcclxuICAgICAgICAvL2RvIG5vdGhpbmcgaWYgZmlsdGVyIGhhcyBub3QgY2hhbmdlZFxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHRoaXMubWluaUZpbHRlciA9IG5ld01pbmlGaWx0ZXI7XHJcbiAgICB0aGlzLmZpbHRlckRpc3BsYXllZFZhbHVlcygpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0TWluaUZpbHRlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMubWluaUZpbHRlcjtcclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5maWx0ZXJEaXNwbGF5ZWRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIGlmIG5vIGZpbHRlciwganVzdCB1c2UgdGhlIHVuaXF1ZSB2YWx1ZXNcclxuICAgIGlmICh0aGlzLm1pbmlGaWx0ZXIgPT09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmRpc3BsYXllZFZhbHVlcyA9IHRoaXMudW5pcXVlVmFsdWVzO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiBmaWx0ZXIgcHJlc2VudCwgd2UgZmlsdGVyIGRvd24gdGhlIGxpc3RcclxuICAgIHRoaXMuZGlzcGxheWVkVmFsdWVzID0gW107XHJcbiAgICB2YXIgbWluaUZpbHRlclVwcGVyQ2FzZSA9IHRoaXMubWluaUZpbHRlci50b1VwcGVyQ2FzZSgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnVuaXF1ZVZhbHVlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICB2YXIgdW5pcXVlVmFsdWUgPSB0aGlzLnVuaXF1ZVZhbHVlc1tpXTtcclxuICAgICAgICBpZiAodW5pcXVlVmFsdWUgIT09IG51bGwgJiYgdW5pcXVlVmFsdWUudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpLmluZGV4T2YobWluaUZpbHRlclVwcGVyQ2FzZSkgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXllZFZhbHVlcy5wdXNoKHVuaXF1ZVZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmdldERpc3BsYXllZFZhbHVlQ291bnQgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BsYXllZFZhbHVlcy5sZW5ndGg7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0RGlzcGxheWVkVmFsdWUgPSBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGxheWVkVmFsdWVzW2luZGV4XTtcclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5zZWxlY3RFdmVyeXRoaW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgY291bnQgPSB0aGlzLnVuaXF1ZVZhbHVlcy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnVuaXF1ZVZhbHVlc1tpXTtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSA9IG51bGw7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNlbGVjdGVkVmFsdWVzQ291bnQgPSBjb3VudDtcclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5pc0ZpbHRlckFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aCAhPT0gdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50O1xyXG59O1xyXG5cclxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnNlbGVjdE5vdGhpbmcgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXAgPSB7fTtcclxuICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNDb3VudCA9IDA7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0VW5pcXVlVmFsdWVDb3VudCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aDtcclxufTtcclxuXHJcblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5nZXRVbmlxdWVWYWx1ZSA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICByZXR1cm4gdGhpcy51bmlxdWVWYWx1ZXNbaW5kZXhdO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnVuc2VsZWN0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXBbdmFsdWVdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5zZWxlY3RlZFZhbHVlc01hcFt2YWx1ZV07XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50LS07XHJcbiAgICB9XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuc2VsZWN0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXBbdmFsdWVdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50Kys7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuaXNWYWx1ZVNlbGVjdGVkID0gZnVuY3Rpb24odmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSAhPT0gdW5kZWZpbmVkO1xyXG59O1xyXG5cclxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmlzRXZlcnl0aGluZ1NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy51bmlxdWVWYWx1ZXMubGVuZ3RoID09PSB0aGlzLnNlbGVjdGVkVmFsdWVzQ291bnQ7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuaXNOb3RoaW5nU2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLnVuaXF1ZVZhbHVlcy5sZW5ndGggPT09IDA7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbigpIHtcclxuICAgIGlmICghdGhpcy5pc0ZpbHRlckFjdGl2ZSgpKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICB2YXIgc2VsZWN0ZWRWYWx1ZXMgPSBbXTtcclxuICAgIHV0aWxzLml0ZXJhdGVPYmplY3QodGhpcy5zZWxlY3RlZFZhbHVlc01hcCwgZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgc2VsZWN0ZWRWYWx1ZXMucHVzaChrZXkpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gc2VsZWN0ZWRWYWx1ZXM7XHJcbn07XHJcblxyXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuc2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbCkge1xyXG4gICAgaWYgKG1vZGVsKSB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3ROb3RoaW5nKCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8bW9kZWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gbW9kZWxbaV07XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnVuaXF1ZVZhbHVlcy5pbmRleE9mKG5ld1ZhbHVlKT49MCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RWYWx1ZShtb2RlbFtpXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1ZhbHVlICcgKyBuZXdWYWx1ZSArICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGZpbHRlcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnNlbGVjdEV2ZXJ5dGhpbmcoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2V0RmlsdGVyTW9kZWw7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PjxkaXY+PHNlbGVjdCBjbGFzcz1hZy1maWx0ZXItc2VsZWN0IGlkPWZpbHRlclR5cGU+PG9wdGlvbiB2YWx1ZT0xPltDT05UQUlOU108L29wdGlvbj48b3B0aW9uIHZhbHVlPTI+W0VRVUFMU108L29wdGlvbj48b3B0aW9uIHZhbHVlPTM+W1NUQVJUUyBXSVRIXTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9ND5bRU5EUyBXSVRIXTwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxkaXY+PGlucHV0IGNsYXNzPWFnLWZpbHRlci1maWx0ZXIgaWQ9ZmlsdGVyVGV4dCB0eXBlPXRleHQgcGxhY2Vob2xkZXI9XFxcIltGSUxURVIuLi5dXFxcIj48L2Rpdj48L2Rpdj5cIjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGV4dEZpbHRlci5odG1sJyk7XHJcblxyXG52YXIgQ09OVEFJTlMgPSAxO1xyXG52YXIgRVFVQUxTID0gMjtcclxudmFyIFNUQVJUU19XSVRIID0gMztcclxudmFyIEVORFNfV0lUSCA9IDQ7XHJcblxyXG5mdW5jdGlvbiBUZXh0RmlsdGVyKHBhcmFtcykge1xyXG4gICAgdGhpcy5maWx0ZXJQYXJhbXMgPSBwYXJhbXMuZmlsdGVyUGFyYW1zO1xyXG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2sgPSBwYXJhbXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrO1xyXG4gICAgdGhpcy5sb2NhbGVUZXh0RnVuYyA9IHBhcmFtcy5sb2NhbGVUZXh0RnVuYztcclxuICAgIHRoaXMudmFsdWVHZXR0ZXIgPSBwYXJhbXMudmFsdWVHZXR0ZXI7XHJcbiAgICB0aGlzLmNyZWF0ZUd1aSgpO1xyXG4gICAgdGhpcy5maWx0ZXJUZXh0ID0gbnVsbDtcclxuICAgIHRoaXMuZmlsdGVyVHlwZSA9IENPTlRBSU5TO1xyXG4gICAgdGhpcy5jcmVhdGVBcGkoKTtcclxufVxyXG5cclxuLyogcHVibGljICovXHJcblRleHRGaWx0ZXIucHJvdG90eXBlLm9uTmV3Um93c0xvYWRlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGtlZXBTZWxlY3Rpb24gPSB0aGlzLmZpbHRlclBhcmFtcyAmJiB0aGlzLmZpbHRlclBhcmFtcy5uZXdSb3dzQWN0aW9uID09PSAna2VlcCc7XHJcbiAgICBpZiAoIWtlZXBTZWxlY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmFwaS5zZXRUeXBlKENPTlRBSU5TKTtcclxuICAgICAgICB0aGlzLmFwaS5zZXRGaWx0ZXIobnVsbCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vKiBwdWJsaWMgKi9cclxuVGV4dEZpbHRlci5wcm90b3R5cGUuYWZ0ZXJHdWlBdHRhY2hlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkLmZvY3VzKCk7XHJcbn07XHJcblxyXG4vKiBwdWJsaWMgKi9cclxuVGV4dEZpbHRlci5wcm90b3R5cGUuZG9lc0ZpbHRlclBhc3MgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICBpZiAoIXRoaXMuZmlsdGVyVGV4dCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZUdldHRlcihub2RlKTtcclxuICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICB2YXIgdmFsdWVMb3dlckNhc2UgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBzd2l0Y2ggKHRoaXMuZmlsdGVyVHlwZSkge1xyXG4gICAgICAgIGNhc2UgQ09OVEFJTlM6XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUxvd2VyQ2FzZS5pbmRleE9mKHRoaXMuZmlsdGVyVGV4dCkgPj0gMDtcclxuICAgICAgICBjYXNlIEVRVUFMUzpcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTG93ZXJDYXNlID09PSB0aGlzLmZpbHRlclRleHQ7XHJcbiAgICAgICAgY2FzZSBTVEFSVFNfV0lUSDpcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTG93ZXJDYXNlLmluZGV4T2YodGhpcy5maWx0ZXJUZXh0KSA9PT0gMDtcclxuICAgICAgICBjYXNlIEVORFNfV0lUSDpcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gdmFsdWVMb3dlckNhc2UuaW5kZXhPZih0aGlzLmZpbHRlclRleHQpO1xyXG4gICAgICAgICAgICByZXR1cm4gaW5kZXggPj0gMCAmJiBpbmRleCA9PT0gKHZhbHVlTG93ZXJDYXNlLmxlbmd0aCAtIHRoaXMuZmlsdGVyVGV4dC5sZW5ndGgpO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIC8vIHNob3VsZCBuZXZlciBoYXBwZW5cclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdpbnZhbGlkIGZpbHRlciB0eXBlICcgKyB0aGlzLmZpbHRlclR5cGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vKiBwdWJsaWMgKi9cclxuVGV4dEZpbHRlci5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lR3VpO1xyXG59O1xyXG5cclxuLyogcHVibGljICovXHJcblRleHRGaWx0ZXIucHJvdG90eXBlLmlzRmlsdGVyQWN0aXZlID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5maWx0ZXJUZXh0ICE9PSBudWxsO1xyXG59O1xyXG5cclxuVGV4dEZpbHRlci5wcm90b3R5cGUuY3JlYXRlVGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0ZW1wbGF0ZVxyXG4gICAgICAgIC5yZXBsYWNlKCdbRklMVEVSLi4uXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2ZpbHRlck9vbycsICdGaWx0ZXIuLi4nKSlcclxuICAgICAgICAucmVwbGFjZSgnW0VRVUFMU10nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdlcXVhbHMnLCAnRXF1YWxzJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tDT05UQUlOU10nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdjb250YWlucycsICdDb250YWlucycpKVxyXG4gICAgICAgIC5yZXBsYWNlKCdbU1RBUlRTIFdJVEhdJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnc3RhcnRzV2l0aCcsICdTdGFydHMgd2l0aCcpKVxyXG4gICAgICAgIC5yZXBsYWNlKCdbRU5EUyBXSVRIXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2VuZHNXaXRoJywgJ0VuZHMgd2l0aCcpKVxyXG47XHJcbn07XHJcblxyXG4nPG9wdGlvbiB2YWx1ZT1cIjFcIj5Db250YWluczwvb3B0aW9uPicsXHJcbiAgICAnPG9wdGlvbiB2YWx1ZT1cIjJcIj5FcXVhbHM8L29wdGlvbj4nLFxyXG4gICAgJzxvcHRpb24gdmFsdWU9XCIzXCI+U3RhcnRzIHdpdGg8L29wdGlvbj4nLFxyXG4gICAgJzxvcHRpb24gdmFsdWU9XCI0XCI+RW5kcyB3aXRoPC9vcHRpb24+JyxcclxuXHJcblxyXG5UZXh0RmlsdGVyLnByb3RvdHlwZS5jcmVhdGVHdWkgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xyXG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCIjZmlsdGVyVGV4dFwiKTtcclxuICAgIHRoaXMuZVR5cGVTZWxlY3QgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcihcIiNmaWx0ZXJUeXBlXCIpO1xyXG5cclxuICAgIHV0aWxzLmFkZENoYW5nZUxpc3RlbmVyKHRoaXMuZUZpbHRlclRleHRGaWVsZCwgdGhpcy5vbkZpbHRlckNoYW5nZWQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLmVUeXBlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vblR5cGVDaGFuZ2VkLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuVGV4dEZpbHRlci5wcm90b3R5cGUub25UeXBlQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5maWx0ZXJUeXBlID0gcGFyc2VJbnQodGhpcy5lVHlwZVNlbGVjdC52YWx1ZSk7XHJcbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xyXG59O1xyXG5cclxuVGV4dEZpbHRlci5wcm90b3R5cGUub25GaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgZmlsdGVyVGV4dCA9IHV0aWxzLm1ha2VOdWxsKHRoaXMuZUZpbHRlclRleHRGaWVsZC52YWx1ZSk7XHJcbiAgICBpZiAoZmlsdGVyVGV4dCAmJiBmaWx0ZXJUZXh0LnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgICBmaWx0ZXJUZXh0ID0gbnVsbDtcclxuICAgIH1cclxuICAgIGlmIChmaWx0ZXJUZXh0KSB7XHJcbiAgICAgICAgdGhpcy5maWx0ZXJUZXh0ID0gZmlsdGVyVGV4dC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmZpbHRlclRleHQgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2soKTtcclxufTtcclxuXHJcblRleHRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUFwaSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5hcGkgPSB7XHJcbiAgICAgICAgRVFVQUxTOiBFUVVBTFMsXHJcbiAgICAgICAgQ09OVEFJTlM6IENPTlRBSU5TLFxyXG4gICAgICAgIFNUQVJUU19XSVRIOiBTVEFSVFNfV0lUSCxcclxuICAgICAgICBFTkRTX1dJVEg6IEVORFNfV0lUSCxcclxuICAgICAgICBzZXRUeXBlOiBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZmlsdGVyVHlwZSA9IHR5cGU7XHJcbiAgICAgICAgICAgIHRoYXQuZVR5cGVTZWxlY3QudmFsdWUgPSB0eXBlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0RmlsdGVyOiBmdW5jdGlvbihmaWx0ZXIpIHtcclxuICAgICAgICAgICAgZmlsdGVyID0gdXRpbHMubWFrZU51bGwoZmlsdGVyKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuZmlsdGVyVGV4dCA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5lRmlsdGVyVGV4dEZpZWxkLnZhbHVlID0gZmlsdGVyO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5maWx0ZXJUZXh0ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHRoYXQuZUZpbHRlclRleHRGaWVsZC52YWx1ZSA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5maWx0ZXJUeXBlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RmlsdGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZmlsdGVyVGV4dDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoYXQuaXNGaWx0ZXJBY3RpdmUoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0aGF0LmZpbHRlclR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB0aGF0LmZpbHRlclRleHRcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0TW9kZWw6IGZ1bmN0aW9uKGRhdGFNb2RlbCkge1xyXG4gICAgICAgICAgICBpZiAoZGF0YU1vZGVsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFR5cGUoZGF0YU1vZGVsLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGaWx0ZXIoZGF0YU1vZGVsLmZpbHRlcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZpbHRlcihudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn07XHJcblxyXG5UZXh0RmlsdGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmFwaTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGV4dEZpbHRlcjtcclxuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxudmFyIEdyaWRPcHRpb25zV3JhcHBlciA9IHJlcXVpcmUoJy4vZ3JpZE9wdGlvbnNXcmFwcGVyJyk7XHJcbnZhciBTZWxlY3Rpb25Db250cm9sbGVyID0gcmVxdWlyZSgnLi9zZWxlY3Rpb25Db250cm9sbGVyJyk7XHJcbnZhciBGaWx0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi9maWx0ZXIvZmlsdGVyTWFuYWdlcicpO1xyXG52YXIgU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9zZWxlY3Rpb25SZW5kZXJlckZhY3RvcnknKTtcclxudmFyIENvbHVtbkNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2NvbHVtbkNvbnRyb2xsZXInKTtcclxudmFyIFJvd1JlbmRlcmVyID0gcmVxdWlyZSgnLi9yb3dSZW5kZXJlcicpO1xyXG52YXIgSGVhZGVyUmVuZGVyZXIgPSByZXF1aXJlKCcuL2hlYWRlclJlbmRlcmVyJyk7XHJcbnZhciBJbk1lbW9yeVJvd0NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL3Jvd0NvbnRyb2xsZXJzL2luTWVtb3J5Um93Q29udHJvbGxlcicpO1xyXG52YXIgVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyID0gcmVxdWlyZSgnLi9yb3dDb250cm9sbGVycy92aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXInKTtcclxudmFyIFBhZ2luYXRpb25Db250cm9sbGVyID0gcmVxdWlyZSgnLi9yb3dDb250cm9sbGVycy9wYWdpbmF0aW9uQ29udHJvbGxlcicpO1xyXG52YXIgRXhwcmVzc2lvblNlcnZpY2UgPSByZXF1aXJlKCcuL2V4cHJlc3Npb25TZXJ2aWNlJyk7XHJcbnZhciBUZW1wbGF0ZVNlcnZpY2UgPSByZXF1aXJlKCcuL3RlbXBsYXRlU2VydmljZScpO1xyXG52YXIgVG9vbFBhbmVsID0gcmVxdWlyZSgnLi90b29sUGFuZWwvdG9vbFBhbmVsJyk7XHJcbnZhciBCb3JkZXJMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dC9ib3JkZXJMYXlvdXQnKTtcclxudmFyIEdyaWRQYW5lbCA9IHJlcXVpcmUoJy4vZ3JpZFBhbmVsL2dyaWRQYW5lbCcpO1xyXG5cclxuZnVuY3Rpb24gR3JpZChlR3JpZERpdiwgZ3JpZE9wdGlvbnMsICRzY29wZSwgJGNvbXBpbGUsIHF1aWNrRmlsdGVyT25TY29wZSkge1xyXG5cclxuICAgIHRoaXMuZ3JpZE9wdGlvbnMgPSBncmlkT3B0aW9ucztcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gbmV3IEdyaWRPcHRpb25zV3JhcHBlcih0aGlzLmdyaWRPcHRpb25zKTtcclxuXHJcbiAgICB0aGlzLnNldHVwQ29tcG9uZW50cygkc2NvcGUsICRjb21waWxlLCBlR3JpZERpdik7XHJcblxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5xdWlja0ZpbHRlciA9IG51bGw7XHJcblxyXG4gICAgLy8gaWYgdXNpbmcgYW5ndWxhciwgd2F0Y2ggZm9yIHF1aWNrRmlsdGVyIGNoYW5nZXNcclxuICAgIGlmICgkc2NvcGUpIHtcclxuICAgICAgICAkc2NvcGUuJHdhdGNoKHF1aWNrRmlsdGVyT25TY29wZSwgZnVuY3Rpb24obmV3RmlsdGVyKSB7XHJcbiAgICAgICAgICAgIHRoYXQub25RdWlja0ZpbHRlckNoYW5nZWQobmV3RmlsdGVyKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3MgPSB7fTtcclxuXHJcbiAgICB2YXIgZm9yUHJpbnQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCk7XHJcbiAgICB0aGlzLmFkZEFwaSgpO1xyXG5cclxuICAgIHRoaXMuc2Nyb2xsV2lkdGggPSB1dGlscy5nZXRTY3JvbGxiYXJXaWR0aCgpO1xyXG5cclxuICAgIC8vIGRvbmUgd2hlbiBjb2xzIGNoYW5nZVxyXG4gICAgdGhpcy5zZXR1cENvbHVtbnMoKTtcclxuXHJcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci5zZXRBbGxSb3dzKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFsbFJvd3MoKSk7XHJcblxyXG4gICAgaWYgKCFmb3JQcmludCkge1xyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLmRvTGF5b3V0LmJpbmQodGhpcykpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudXBkYXRlTW9kZWxBbmRSZWZyZXNoKGNvbnN0YW50cy5TVEVQX0VWRVJZVEhJTkcpO1xyXG5cclxuICAgIC8vIGlmIG5vIGRhdGEgcHJvdmlkZWQgaW5pdGlhbGx5LCBhbmQgbm90IGRvaW5nIGluZmluaXRlIHNjcm9sbGluZywgc2hvdyB0aGUgbG9hZGluZyBwYW5lbFxyXG4gICAgdmFyIHNob3dMb2FkaW5nID0gIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFsbFJvd3MoKSAmJiAhdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNWaXJ0dWFsUGFnaW5nKCk7XHJcbiAgICB0aGlzLnNob3dMb2FkaW5nUGFuZWwoc2hvd0xvYWRpbmcpO1xyXG5cclxuICAgIC8vIGlmIGRhdGFzb3VyY2UgcHJvdmlkZWQsIHVzZSBpdFxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldERhdGFzb3VyY2UoKSkge1xyXG4gICAgICAgIHRoaXMuc2V0RGF0YXNvdXJjZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZG9MYXlvdXQoKTtcclxuXHJcbiAgICAvLyBpZiByZWFkeSBmdW5jdGlvbiBwcm92aWRlZCwgdXNlIGl0XHJcbiAgICBpZiAodHlwZW9mIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJlYWR5KCkgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJlYWR5KCkoZ3JpZE9wdGlvbnMuYXBpKTtcclxuICAgIH1cclxufVxyXG5cclxuR3JpZC5wcm90b3R5cGUuc2V0dXBDb21wb25lbnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkY29tcGlsZSwgZVVzZXJQcm92aWRlZERpdikge1xyXG5cclxuICAgIC8vIG1ha2UgbG9jYWwgcmVmZXJlbmNlcywgdG8gbWFrZSB0aGUgYmVsb3cgbW9yZSBodW1hbiByZWFkYWJsZVxyXG4gICAgdmFyIGdyaWRPcHRpb25zV3JhcHBlciA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdmFyIGdyaWRPcHRpb25zID0gdGhpcy5ncmlkT3B0aW9ucztcclxuICAgIHZhciBmb3JQcmludCA9IGdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCk7XHJcblxyXG4gICAgLy8gY3JlYXRlIGFsbCB0aGUgYmVhbnNcclxuICAgIHZhciBzZWxlY3Rpb25Db250cm9sbGVyID0gbmV3IFNlbGVjdGlvbkNvbnRyb2xsZXIoKTtcclxuICAgIHZhciBmaWx0ZXJNYW5hZ2VyID0gbmV3IEZpbHRlck1hbmFnZXIoKTtcclxuICAgIHZhciBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkgPSBuZXcgU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KCk7XHJcbiAgICB2YXIgY29sdW1uQ29udHJvbGxlciA9IG5ldyBDb2x1bW5Db250cm9sbGVyKCk7XHJcbiAgICB2YXIgcm93UmVuZGVyZXIgPSBuZXcgUm93UmVuZGVyZXIoKTtcclxuICAgIHZhciBoZWFkZXJSZW5kZXJlciA9IG5ldyBIZWFkZXJSZW5kZXJlcigpO1xyXG4gICAgdmFyIGluTWVtb3J5Um93Q29udHJvbGxlciA9IG5ldyBJbk1lbW9yeVJvd0NvbnRyb2xsZXIoKTtcclxuICAgIHZhciB2aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIgPSBuZXcgVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyKCk7XHJcbiAgICB2YXIgZXhwcmVzc2lvblNlcnZpY2UgPSBuZXcgRXhwcmVzc2lvblNlcnZpY2UoKTtcclxuICAgIHZhciB0ZW1wbGF0ZVNlcnZpY2UgPSBuZXcgVGVtcGxhdGVTZXJ2aWNlKCk7XHJcbiAgICB2YXIgZ3JpZFBhbmVsID0gbmV3IEdyaWRQYW5lbChncmlkT3B0aW9uc1dyYXBwZXIpO1xyXG5cclxuICAgIHZhciBjb2x1bW5Nb2RlbCA9IGNvbHVtbkNvbnRyb2xsZXIuZ2V0TW9kZWwoKTtcclxuXHJcbiAgICAvLyBpbml0aWFsaXNlIGFsbCB0aGUgYmVhbnNcclxuICAgIHRlbXBsYXRlU2VydmljZS5pbml0KCRzY29wZSk7XHJcbiAgICBzZWxlY3Rpb25Db250cm9sbGVyLmluaXQodGhpcywgZ3JpZFBhbmVsLCBncmlkT3B0aW9uc1dyYXBwZXIsICRzY29wZSwgcm93UmVuZGVyZXIpO1xyXG4gICAgZmlsdGVyTWFuYWdlci5pbml0KHRoaXMsIGdyaWRPcHRpb25zV3JhcHBlciwgJGNvbXBpbGUsICRzY29wZSwgZXhwcmVzc2lvblNlcnZpY2UsIGNvbHVtbk1vZGVsKTtcclxuICAgIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeS5pbml0KHRoaXMsIHNlbGVjdGlvbkNvbnRyb2xsZXIpO1xyXG4gICAgY29sdW1uQ29udHJvbGxlci5pbml0KHRoaXMsIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBleHByZXNzaW9uU2VydmljZSk7XHJcbiAgICByb3dSZW5kZXJlci5pbml0KGdyaWRPcHRpb25zLCBjb2x1bW5Nb2RlbCwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBncmlkUGFuZWwsIHRoaXMsXHJcbiAgICAgICAgc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LCAkY29tcGlsZSwgJHNjb3BlLCBzZWxlY3Rpb25Db250cm9sbGVyLCBleHByZXNzaW9uU2VydmljZSwgdGVtcGxhdGVTZXJ2aWNlKTtcclxuICAgIGhlYWRlclJlbmRlcmVyLmluaXQoZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW5Db250cm9sbGVyLCBjb2x1bW5Nb2RlbCwgZ3JpZFBhbmVsLCB0aGlzLCBmaWx0ZXJNYW5hZ2VyLFxyXG4gICAgICAgICRzY29wZSwgJGNvbXBpbGUsIGV4cHJlc3Npb25TZXJ2aWNlKTtcclxuICAgIGluTWVtb3J5Um93Q29udHJvbGxlci5pbml0KGdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uTW9kZWwsIHRoaXMsIGZpbHRlck1hbmFnZXIsICRzY29wZSwgZXhwcmVzc2lvblNlcnZpY2UpO1xyXG4gICAgdmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLmluaXQocm93UmVuZGVyZXIsIGdyaWRPcHRpb25zV3JhcHBlciwgdGhpcyk7XHJcbiAgICBncmlkUGFuZWwuaW5pdChjb2x1bW5Nb2RlbCwgcm93UmVuZGVyZXIpO1xyXG5cclxuICAgIHZhciB0b29sUGFuZWxMYXlvdXQgPSBudWxsO1xyXG4gICAgdmFyIGVUb29sUGFuZWwgPSBudWxsO1xyXG4gICAgaWYgKCFmb3JQcmludCkge1xyXG4gICAgICAgIGVUb29sUGFuZWwgPSBuZXcgVG9vbFBhbmVsKCk7XHJcbiAgICAgICAgdG9vbFBhbmVsTGF5b3V0ID0gZVRvb2xQYW5lbC5sYXlvdXQ7XHJcbiAgICAgICAgZVRvb2xQYW5lbC5pbml0KGNvbHVtbkNvbnRyb2xsZXIsIGluTWVtb3J5Um93Q29udHJvbGxlciwgZ3JpZE9wdGlvbnNXcmFwcGVyKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGlzIGlzIGEgY2hpbGQgYmVhbiwgZ2V0IGEgcmVmZXJlbmNlIGFuZCBwYXNzIGl0IG9uXHJcbiAgICAvLyBDQU4gV0UgREVMRVRFIFRISVM/IGl0J3MgZG9uZSBpbiB0aGUgc2V0RGF0YXNvdXJjZSBzZWN0aW9uXHJcbiAgICB2YXIgcm93TW9kZWwgPSBpbk1lbW9yeVJvd0NvbnRyb2xsZXIuZ2V0TW9kZWwoKTtcclxuICAgIHNlbGVjdGlvbkNvbnRyb2xsZXIuc2V0Um93TW9kZWwocm93TW9kZWwpO1xyXG4gICAgZmlsdGVyTWFuYWdlci5zZXRSb3dNb2RlbChyb3dNb2RlbCk7XHJcbiAgICByb3dSZW5kZXJlci5zZXRSb3dNb2RlbChyb3dNb2RlbCk7XHJcbiAgICBncmlkUGFuZWwuc2V0Um93TW9kZWwocm93TW9kZWwpO1xyXG5cclxuICAgIC8vIGFuZCB0aGUgbGFzdCBiZWFuLCBkb25lIGluIGl0J3Mgb3duIHNlY3Rpb24sIGFzIGl0J3Mgb3B0aW9uYWxcclxuICAgIHZhciBwYWdpbmF0aW9uQ29udHJvbGxlciA9IG51bGw7XHJcbiAgICB2YXIgcGFnaW5hdGlvbkd1aSA9IG51bGw7XHJcbiAgICBpZiAoIWZvclByaW50KSB7XHJcbiAgICAgICAgcGFnaW5hdGlvbkNvbnRyb2xsZXIgPSBuZXcgUGFnaW5hdGlvbkNvbnRyb2xsZXIoKTtcclxuICAgICAgICBwYWdpbmF0aW9uQ29udHJvbGxlci5pbml0KHRoaXMsIGdyaWRPcHRpb25zV3JhcHBlcik7XHJcbiAgICAgICAgcGFnaW5hdGlvbkd1aSA9IHBhZ2luYXRpb25Db250cm9sbGVyLmdldEd1aSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcclxuICAgIHRoaXMuc2VsZWN0aW9uQ29udHJvbGxlciA9IHNlbGVjdGlvbkNvbnRyb2xsZXI7XHJcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIgPSBjb2x1bW5Db250cm9sbGVyO1xyXG4gICAgdGhpcy5jb2x1bW5Nb2RlbCA9IGNvbHVtbk1vZGVsO1xyXG4gICAgdGhpcy5pbk1lbW9yeVJvd0NvbnRyb2xsZXIgPSBpbk1lbW9yeVJvd0NvbnRyb2xsZXI7XHJcbiAgICB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlciA9IHZpcnR1YWxQYWdlUm93Q29udHJvbGxlcjtcclxuICAgIHRoaXMucm93UmVuZGVyZXIgPSByb3dSZW5kZXJlcjtcclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIgPSBoZWFkZXJSZW5kZXJlcjtcclxuICAgIHRoaXMucGFnaW5hdGlvbkNvbnRyb2xsZXIgPSBwYWdpbmF0aW9uQ29udHJvbGxlcjtcclxuICAgIHRoaXMuZmlsdGVyTWFuYWdlciA9IGZpbHRlck1hbmFnZXI7XHJcbiAgICB0aGlzLmVUb29sUGFuZWwgPSBlVG9vbFBhbmVsO1xyXG4gICAgdGhpcy5ncmlkUGFuZWwgPSBncmlkUGFuZWw7XHJcblxyXG4gICAgdGhpcy5lUm9vdFBhbmVsID0gbmV3IEJvcmRlckxheW91dCh7XHJcbiAgICAgICAgY2VudGVyOiBncmlkUGFuZWwubGF5b3V0LFxyXG4gICAgICAgIGVhc3Q6IHRvb2xQYW5lbExheW91dCxcclxuICAgICAgICBzb3V0aDogcGFnaW5hdGlvbkd1aSxcclxuICAgICAgICBkb250RmlsbDogZm9yUHJpbnQsXHJcbiAgICAgICAgbmFtZTogJ2VSb290UGFuZWwnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBkZWZhdWx0IGlzIHdlIGRvbid0IHNob3cgcGFnaW5nIHBhbmVsLCB0aGlzIGlzIHNldCB0byB0cnVlIHdoZW4gZGF0YXNvdXJjZSBpcyBzZXRcclxuICAgIHRoaXMuZVJvb3RQYW5lbC5zZXRTb3V0aFZpc2libGUoZmFsc2UpO1xyXG5cclxuICAgIC8vIHNlZSB3aGF0IHRoZSBncmlkIG9wdGlvbnMgYXJlIGZvciBkZWZhdWx0IG9mIHRvb2xiYXJcclxuICAgIHRoaXMuc2hvd1Rvb2xQYW5lbChncmlkT3B0aW9uc1dyYXBwZXIuaXNTaG93VG9vbFBhbmVsKCkpO1xyXG5cclxuICAgIGVVc2VyUHJvdmlkZWREaXYuYXBwZW5kQ2hpbGQodGhpcy5lUm9vdFBhbmVsLmdldEd1aSgpKTtcclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLnNob3dUb29sUGFuZWwgPSBmdW5jdGlvbihzaG93KSB7XHJcbiAgICBpZiAoIXRoaXMuZVRvb2xQYW5lbCkge1xyXG4gICAgICAgIHRoaXMudG9vbFBhbmVsU2hvd2luZyA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRvb2xQYW5lbFNob3dpbmcgPSBzaG93O1xyXG4gICAgdGhpcy5lUm9vdFBhbmVsLnNldEVhc3RWaXNpYmxlKHNob3cpO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuaXNUb29sUGFuZWxTaG93aW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy50b29sUGFuZWxTaG93aW5nO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuc2V0RGF0YXNvdXJjZSA9IGZ1bmN0aW9uKGRhdGFzb3VyY2UpIHtcclxuICAgIC8vIGlmIGRhdGFzb3VyY2UgcHJvdmlkZWQsIHRoZW4gc2V0IGl0XHJcbiAgICBpZiAoZGF0YXNvdXJjZSkge1xyXG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnMuZGF0YXNvdXJjZSA9IGRhdGFzb3VyY2U7XHJcbiAgICB9XHJcbiAgICAvLyBnZXQgdGhlIHNldCBkYXRhc291cmNlIChpZiBudWxsIHdhcyBwYXNzZWQgdG8gdGhpcyBtZXRob2QsXHJcbiAgICAvLyB0aGVuIG5lZWQgdG8gZ2V0IHRoZSBhY3R1YWwgZGF0YXNvdXJjZSBmcm9tIG9wdGlvbnNcclxuICAgIHZhciBkYXRhc291cmNlVG9Vc2UgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXREYXRhc291cmNlKCk7XHJcbiAgICB0aGlzLmRvaW5nVmlydHVhbFBhZ2luZyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzVmlydHVhbFBhZ2luZygpICYmIGRhdGFzb3VyY2VUb1VzZTtcclxuICAgIHRoaXMuZG9pbmdQYWdpbmF0aW9uID0gZGF0YXNvdXJjZVRvVXNlICYmICF0aGlzLmRvaW5nVmlydHVhbFBhZ2luZztcclxuICAgIHZhciBzaG93UGFnaW5nUGFuZWw7XHJcblxyXG4gICAgaWYgKHRoaXMuZG9pbmdWaXJ0dWFsUGFnaW5nKSB7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uQ29udHJvbGxlci5zZXREYXRhc291cmNlKG51bGwpO1xyXG4gICAgICAgIHRoaXMudmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnNldERhdGFzb3VyY2UoZGF0YXNvdXJjZVRvVXNlKTtcclxuICAgICAgICB0aGlzLnJvd01vZGVsID0gdGhpcy52aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIuZ2V0TW9kZWwoKTtcclxuICAgICAgICBzaG93UGFnaW5nUGFuZWwgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5kb2luZ1BhZ2luYXRpb24pIHtcclxuICAgICAgICB0aGlzLnBhZ2luYXRpb25Db250cm9sbGVyLnNldERhdGFzb3VyY2UoZGF0YXNvdXJjZVRvVXNlKTtcclxuICAgICAgICB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5zZXREYXRhc291cmNlKG51bGwpO1xyXG4gICAgICAgIHRoaXMucm93TW9kZWwgPSB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci5nZXRNb2RlbCgpO1xyXG4gICAgICAgIHNob3dQYWdpbmdQYW5lbCA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMucGFnaW5hdGlvbkNvbnRyb2xsZXIuc2V0RGF0YXNvdXJjZShudWxsKTtcclxuICAgICAgICB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5zZXREYXRhc291cmNlKG51bGwpO1xyXG4gICAgICAgIHRoaXMucm93TW9kZWwgPSB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci5nZXRNb2RlbCgpO1xyXG4gICAgICAgIHNob3dQYWdpbmdQYW5lbCA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc2VsZWN0aW9uQ29udHJvbGxlci5zZXRSb3dNb2RlbCh0aGlzLnJvd01vZGVsKTtcclxuICAgIHRoaXMuZmlsdGVyTWFuYWdlci5zZXRSb3dNb2RlbCh0aGlzLnJvd01vZGVsKTtcclxuICAgIHRoaXMucm93UmVuZGVyZXIuc2V0Um93TW9kZWwodGhpcy5yb3dNb2RlbCk7XHJcblxyXG4gICAgdGhpcy5lUm9vdFBhbmVsLnNldFNvdXRoVmlzaWJsZShzaG93UGFnaW5nUGFuZWwpO1xyXG5cclxuICAgIC8vIGJlY2F1c2Ugd2UganVzdCBzZXQgdGhlIHJvd01vZGVsLCBuZWVkIHRvIHVwZGF0ZSB0aGUgZ3VpXHJcbiAgICB0aGlzLnJvd1JlbmRlcmVyLnJlZnJlc2hWaWV3KCk7XHJcblxyXG4gICAgdGhpcy5kb0xheW91dCgpO1xyXG59O1xyXG5cclxuLy8gZ2V0cyBjYWxsZWQgYWZ0ZXIgY29sdW1ucyBhcmUgc2hvd24gLyBoaWRkZW4gZnJvbSBncm91cHMgZXhwYW5kaW5nXHJcbkdyaWQucHJvdG90eXBlLnJlZnJlc2hIZWFkZXJBbmRCb2R5ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyLnJlZnJlc2hIZWFkZXIoKTtcclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlRmlsdGVySWNvbnMoKTtcclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlU29ydEljb25zKCk7XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRCb2R5Q29udGFpbmVyV2lkdGgoKTtcclxuICAgIHRoaXMuZ3JpZFBhbmVsLnNldFBpbm5lZENvbENvbnRhaW5lcldpZHRoKCk7XHJcbiAgICB0aGlzLnJvd1JlbmRlcmVyLnJlZnJlc2hWaWV3KCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5zZXRGaW5pc2hlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZG9MYXlvdXQpO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuZ2V0UG9wdXBQYXJlbnQgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmVSb290UGFuZWwuZ2V0R3VpKCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5nZXRRdWlja0ZpbHRlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMucXVpY2tGaWx0ZXI7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5vblF1aWNrRmlsdGVyQ2hhbmdlZCA9IGZ1bmN0aW9uKG5ld0ZpbHRlcikge1xyXG4gICAgaWYgKG5ld0ZpbHRlciA9PT0gdW5kZWZpbmVkIHx8IG5ld0ZpbHRlciA9PT0gXCJcIikge1xyXG4gICAgICAgIG5ld0ZpbHRlciA9IG51bGw7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5xdWlja0ZpbHRlciAhPT0gbmV3RmlsdGVyKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzVmlydHVhbFBhZ2luZygpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogY2Fubm90IGRvIHF1aWNrIGZpbHRlcmluZyB3aGVuIGRvaW5nIHZpcnR1YWwgcGFnaW5nJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vd2FudCAnbnVsbCcgdG8gbWVhbiB0byBmaWx0ZXIsIHNvIHJlbW92ZSB1bmRlZmluZWQgYW5kIGVtcHR5IHN0cmluZ1xyXG4gICAgICAgIGlmIChuZXdGaWx0ZXIgPT09IHVuZGVmaW5lZCB8fCBuZXdGaWx0ZXIgPT09IFwiXCIpIHtcclxuICAgICAgICAgICAgbmV3RmlsdGVyID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5ld0ZpbHRlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBuZXdGaWx0ZXIgPSBuZXdGaWx0ZXIudG9VcHBlckNhc2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5xdWlja0ZpbHRlciA9IG5ld0ZpbHRlcjtcclxuICAgICAgICB0aGlzLm9uRmlsdGVyQ2hhbmdlZCgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUub25GaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyLnVwZGF0ZUZpbHRlckljb25zKCk7XHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVTZXJ2ZXJTaWRlRmlsdGVyKCkpIHtcclxuICAgICAgICAvLyBpZiBkb2luZyBzZXJ2ZXIgc2lkZSBmaWx0ZXJpbmcsIGNoYW5naW5nIHRoZSBzb3J0IGhhcyB0aGUgaW1wYWN0XHJcbiAgICAgICAgLy8gb2YgcmVzZXR0aW5nIHRoZSBkYXRhc291cmNlXHJcbiAgICAgICAgdGhpcy5zZXREYXRhc291cmNlKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIGlmIGRvaW5nIGluIG1lbW9yeSBmaWx0ZXJpbmcsIHdlIGp1c3QgdXBkYXRlIHRoZSBpbiBtZW1vcnkgZGF0YVxyXG4gICAgICAgIHRoaXMudXBkYXRlTW9kZWxBbmRSZWZyZXNoKGNvbnN0YW50cy5TVEVQX0ZJTFRFUik7XHJcbiAgICB9XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5vblJvd0NsaWNrZWQgPSBmdW5jdGlvbihldmVudCwgcm93SW5kZXgsIG5vZGUpIHtcclxuXHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9ucy5yb3dDbGlja2VkKSB7XHJcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxyXG4gICAgICAgICAgICBldmVudDogZXZlbnQsXHJcbiAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9ucy5yb3dDbGlja2VkKHBhcmFtcyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2UgZG8gbm90IGFsbG93IHNlbGVjdGluZyBncm91cHMgYnkgY2xpY2tpbmcgKGFzIHRoZSBjbGljayBoZXJlIGV4cGFuZHMgdGhlIGdyb3VwKVxyXG4gICAgLy8gc28gcmV0dXJuIGlmIGl0J3MgYSBncm91cCByb3dcclxuICAgIGlmIChub2RlLmdyb3VwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG1ha2luZyBsb2NhbCB2YXJpYWJsZXMgdG8gbWFrZSB0aGUgYmVsb3cgbW9yZSByZWFkYWJsZVxyXG4gICAgdmFyIGdyaWRPcHRpb25zV3JhcHBlciA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdmFyIHNlbGVjdGlvbkNvbnRyb2xsZXIgPSB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXI7XHJcblxyXG4gICAgLy8gaWYgbm8gc2VsZWN0aW9uIG1ldGhvZCBlbmFibGVkLCBkbyBub3RoaW5nXHJcbiAgICBpZiAoIWdyaWRPcHRpb25zV3JhcHBlci5pc1Jvd1NlbGVjdGlvbigpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIGNsaWNrIHNlbGVjdGlvbiBzdXBwcmVzc2VkLCBkbyBub3RoaW5nXHJcbiAgICBpZiAoZ3JpZE9wdGlvbnNXcmFwcGVyLmlzU3VwcHJlc3NSb3dDbGlja1NlbGVjdGlvbigpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGN0cmxLZXkgZm9yIHdpbmRvd3MsIG1ldGFLZXkgZm9yIEFwcGxlXHJcbiAgICB2YXIgY3RybEtleVByZXNzZWQgPSBldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXk7XHJcblxyXG4gICAgdmFyIGRvRGVzZWxlY3QgPSBjdHJsS2V5UHJlc3NlZFxyXG4gICAgICAgICYmIHNlbGVjdGlvbkNvbnRyb2xsZXIuaXNOb2RlU2VsZWN0ZWQobm9kZSlcclxuICAgICAgICAmJiBncmlkT3B0aW9uc1dyYXBwZXIuaXNSb3dEZXNlbGVjdGlvbigpIDtcclxuXHJcbiAgICBpZiAoZG9EZXNlbGVjdCkge1xyXG4gICAgICAgIHNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3ROb2RlKG5vZGUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgdHJ5TXVsdGkgPSBjdHJsS2V5UHJlc3NlZDtcclxuICAgICAgICBzZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdE5vZGUobm9kZSwgdHJ5TXVsdGkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuc2hvd0xvYWRpbmdQYW5lbCA9IGZ1bmN0aW9uKHNob3cpIHtcclxuICAgIHRoaXMuZ3JpZFBhbmVsLnNob3dMb2FkaW5nKHNob3cpO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuc2V0dXBDb2x1bW5zID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRIZWFkZXJIZWlnaHQoKTtcclxuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlci5zZXRDb2x1bW5zKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbHVtbkRlZnMoKSk7XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5zaG93UGlubmVkQ29sQ29udGFpbmVyc0lmTmVlZGVkKCk7XHJcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyLnJlZnJlc2hIZWFkZXIoKTtcclxuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNEb250VXNlU2Nyb2xscygpKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkUGFuZWwuc2V0UGlubmVkQ29sQ29udGFpbmVyV2lkdGgoKTtcclxuICAgICAgICB0aGlzLmdyaWRQYW5lbC5zZXRCb2R5Q29udGFpbmVyV2lkdGgoKTtcclxuICAgIH1cclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlRmlsdGVySWNvbnMoKTtcclxufTtcclxuXHJcbi8vIHJvd3NUb1JlZnJlc2ggaXMgYXQgd2hhdCBpbmRleCB0byBzdGFydCByZWZyZXNoaW5nIHRoZSByb3dzLiB0aGUgYXNzdW1wdGlvbiBpc1xyXG4vLyBpZiB3ZSBhcmUgZXhwYW5kaW5nIG9yIGNvbGxhcHNpbmcgYSBncm91cCwgdGhlbiBvbmx5IGhlIHJvd3MgYmVsb3cgdGhlIGdyb3VwXHJcbi8vIG5lZWQgdG8gYmUgcmVmcmVzaC4gdGhpcyBhbGxvd3MgdGhlIGNvbnRleHQgKGVnIGZvY3VzKSBvZiB0aGUgb3RoZXIgY2VsbHMgdG9cclxuLy8gcmVtYWluLlxyXG5HcmlkLnByb3RvdHlwZS51cGRhdGVNb2RlbEFuZFJlZnJlc2ggPSBmdW5jdGlvbihzdGVwLCByZWZyZXNoRnJvbUluZGV4KSB7XHJcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci51cGRhdGVNb2RlbChzdGVwKTtcclxuICAgIHRoaXMucm93UmVuZGVyZXIucmVmcmVzaFZpZXcocmVmcmVzaEZyb21JbmRleCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5zZXRSb3dzID0gZnVuY3Rpb24ocm93cywgZmlyc3RJZCkge1xyXG4gICAgaWYgKHJvd3MpIHtcclxuICAgICAgICB0aGlzLmdyaWRPcHRpb25zLnJvd0RhdGEgPSByb3dzO1xyXG4gICAgfVxyXG4gICAgdGhpcy5pbk1lbW9yeVJvd0NvbnRyb2xsZXIuc2V0QWxsUm93cyh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBbGxSb3dzKCksIGZpcnN0SWQpO1xyXG4gICAgdGhpcy5zZWxlY3Rpb25Db250cm9sbGVyLmRlc2VsZWN0QWxsKCk7XHJcbiAgICB0aGlzLmZpbHRlck1hbmFnZXIub25OZXdSb3dzTG9hZGVkKCk7XHJcbiAgICB0aGlzLnVwZGF0ZU1vZGVsQW5kUmVmcmVzaChjb25zdGFudHMuU1RFUF9FVkVSWVRISU5HKTtcclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlRmlsdGVySWNvbnMoKTtcclxuICAgIHRoaXMuc2hvd0xvYWRpbmdQYW5lbChmYWxzZSk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5lbnN1cmVOb2RlVmlzaWJsZSA9IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcclxuICAgIGlmICh0aGlzLmRvaW5nVmlydHVhbFBhZ2luZykge1xyXG4gICAgICAgIHRocm93ICdDYW5ub3QgdXNlIGVuc3VyZU5vZGVWaXNpYmxlIHdoZW4gZG9pbmcgdmlydHVhbCBwYWdpbmcsIGFzIHdlIGNhbm5vdCBjaGVjayByb3dzIHRoYXQgYXJlIG5vdCBpbiBtZW1vcnknO1xyXG4gICAgfVxyXG4gICAgLy8gbG9vayBmb3IgdGhlIG5vZGUgaW5kZXggd2Ugd2FudCB0byBkaXNwbGF5XHJcbiAgICB2YXIgcm93Q291bnQgPSB0aGlzLnJvd01vZGVsLmdldFZpcnR1YWxSb3dDb3VudCgpO1xyXG4gICAgdmFyIGNvbXBhcmF0b3JJc0FGdW5jdGlvbiA9IHR5cGVvZiBjb21wYXJhdG9yID09PSAnZnVuY3Rpb24nO1xyXG4gICAgdmFyIGluZGV4VG9TZWxlY3QgPSAtMTtcclxuICAgIC8vIGdvIHRocm91Z2ggYWxsIHRoZSBub2RlcywgZmluZCB0aGUgb25lIHdlIHdhbnQgdG8gc2hvd1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnJvd01vZGVsLmdldFZpcnR1YWxSb3coaSk7XHJcbiAgICAgICAgaWYgKGNvbXBhcmF0b3JJc0FGdW5jdGlvbikge1xyXG4gICAgICAgICAgICBpZiAoY29tcGFyYXRvcihub2RlKSkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXhUb1NlbGVjdCA9IGk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIG9iamVjdCBlcXVhbGl0eSBhZ2FpbnN0IG5vZGUgYW5kIGRhdGFcclxuICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IgPT09IG5vZGUgfHwgY29tcGFyYXRvciA9PT0gbm9kZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleFRvU2VsZWN0ID0gaTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4VG9TZWxlY3QgPj0gMCkge1xyXG4gICAgICAgIHRoaXMuZ3JpZFBhbmVsLmVuc3VyZUluZGV4VmlzaWJsZShpbmRleFRvU2VsZWN0KTtcclxuICAgIH1cclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLmdldEZpbHRlck1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5maWx0ZXJNYW5hZ2VyLmdldEZpbHRlck1vZGVsKCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5hZGRBcGkgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciBhcGkgPSB7XHJcbiAgICAgICAgc2V0RGF0YXNvdXJjZTogZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xyXG4gICAgICAgICAgICB0aGF0LnNldERhdGFzb3VyY2UoZGF0YXNvdXJjZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbk5ld0RhdGFzb3VyY2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGF0LnNldERhdGFzb3VyY2UoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFJvd3M6IGZ1bmN0aW9uKHJvd3MpIHtcclxuICAgICAgICAgICAgdGhhdC5zZXRSb3dzKHJvd3MpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb25OZXdSb3dzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5zZXRSb3dzKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbk5ld0NvbHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGF0Lm9uTmV3Q29scygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdW5zZWxlY3RBbGw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwidW5zZWxlY3RBbGwgZGVwcmVjYXRlZCwgY2FsbCBkZXNlbGVjdEFsbCBpbnN0ZWFkXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc2VsZWN0QWxsKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWZyZXNoVmlldzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQucm93UmVuZGVyZXIucmVmcmVzaFZpZXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNvZnRSZWZyZXNoVmlldzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQucm93UmVuZGVyZXIuc29mdFJlZnJlc2hWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWZyZXNoR3JvdXBSb3dzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoR3JvdXBSb3dzKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWZyZXNoSGVhZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gbmVlZCB0byByZXZpZXcgdGhpcyAtIHRoZSByZWZyZXNoSGVhZGVyIHNob3VsZCBhbHNvIHJlZnJlc2ggYWxsIGljb25zIGluIHRoZSBoZWFkZXJcclxuICAgICAgICAgICAgdGhhdC5oZWFkZXJSZW5kZXJlci5yZWZyZXNoSGVhZGVyKCk7XHJcbiAgICAgICAgICAgIHRoYXQuaGVhZGVyUmVuZGVyZXIudXBkYXRlRmlsdGVySWNvbnMoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93TW9kZWw7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkdyb3VwRXhwYW5kZWRPckNvbGxhcHNlZDogZnVuY3Rpb24ocmVmcmVzaEZyb21JbmRleCkge1xyXG4gICAgICAgICAgICB0aGF0LnVwZGF0ZU1vZGVsQW5kUmVmcmVzaChjb25zdGFudHMuU1RFUF9NQVAsIHJlZnJlc2hGcm9tSW5kZXgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXhwYW5kQWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5pbk1lbW9yeVJvd0NvbnRyb2xsZXIuZXhwYW5kT3JDb2xsYXBzZUFsbCh0cnVlLCBudWxsKTtcclxuICAgICAgICAgICAgdGhhdC51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfTUFQKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbGxhcHNlQWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5pbk1lbW9yeVJvd0NvbnRyb2xsZXIuZXhwYW5kT3JDb2xsYXBzZUFsbChmYWxzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIHRoYXQudXBkYXRlTW9kZWxBbmRSZWZyZXNoKGNvbnN0YW50cy5TVEVQX01BUCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGRWaXJ0dWFsUm93TGlzdGVuZXI6IGZ1bmN0aW9uKHJvd0luZGV4LCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGF0LmFkZFZpcnR1YWxSb3dMaXN0ZW5lcihyb3dJbmRleCwgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcm93RGF0YUNoYW5nZWQ6IGZ1bmN0aW9uKHJvd3MpIHtcclxuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yb3dEYXRhQ2hhbmdlZChyb3dzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFF1aWNrRmlsdGVyOiBmdW5jdGlvbihuZXdGaWx0ZXIpIHtcclxuICAgICAgICAgICAgdGhhdC5vblF1aWNrRmlsdGVyQ2hhbmdlZChuZXdGaWx0ZXIpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWxlY3RJbmRleDogZnVuY3Rpb24oaW5kZXgsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cykge1xyXG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuc2VsZWN0SW5kZXgoaW5kZXgsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZXNlbGVjdEluZGV4OiBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3RJbmRleChpbmRleCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWxlY3ROb2RlOiBmdW5jdGlvbihub2RlLCB0cnlNdWx0aSwgc3VwcHJlc3NFdmVudHMpIHtcclxuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdE5vZGUobm9kZSwgdHJ5TXVsdGksIHN1cHByZXNzRXZlbnRzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlc2VsZWN0Tm9kZTogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3ROb2RlKG5vZGUpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2VsZWN0QWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdEFsbCgpO1xyXG4gICAgICAgICAgICB0aGF0LnJvd1JlbmRlcmVyLnJlZnJlc2hWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZXNlbGVjdEFsbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5kZXNlbGVjdEFsbCgpO1xyXG4gICAgICAgICAgICB0aGF0LnJvd1JlbmRlcmVyLnJlZnJlc2hWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZWNvbXB1dGVBZ2dyZWdhdGVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhhdC5pbk1lbW9yeVJvd0NvbnRyb2xsZXIuZG9BZ2dyZWdhdGUoKTtcclxuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoR3JvdXBSb3dzKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaXplQ29sdW1uc1RvRml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdhZy1ncmlkOiBzaXplQ29sdW1uc1RvRml0IGRvZXMgbm90IHdvcmsgd2hlbiBkb250VXNlU2Nyb2xscz10cnVlJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gdGhhdC5ncmlkUGFuZWwuZ2V0V2lkdGhGb3JTaXplQ29sc1RvRml0KCk7XHJcbiAgICAgICAgICAgIHRoYXQuY29sdW1uQ29udHJvbGxlci5zaXplQ29sdW1uc1RvRml0KGF2YWlsYWJsZVdpZHRoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNob3dMb2FkaW5nOiBmdW5jdGlvbihzaG93KSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2hvd0xvYWRpbmdQYW5lbChzaG93KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTm9kZVNlbGVjdGVkOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuaXNOb2RlU2VsZWN0ZWQobm9kZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRTZWxlY3RlZE5vZGVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5nZXRTZWxlY3RlZE5vZGVzKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRCZXN0Q29zdE5vZGVTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLmdldEJlc3RDb3N0Tm9kZVNlbGVjdGlvbigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW5zdXJlQ29sSW5kZXhWaXNpYmxlOiBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICB0aGF0LmdyaWRQYW5lbC5lbnN1cmVDb2xJbmRleFZpc2libGUoaW5kZXgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW5zdXJlSW5kZXhWaXNpYmxlOiBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICB0aGF0LmdyaWRQYW5lbC5lbnN1cmVJbmRleFZpc2libGUoaW5kZXgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW5zdXJlTm9kZVZpc2libGU6IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcclxuICAgICAgICAgICAgdGhhdC5lbnN1cmVOb2RlVmlzaWJsZShjb21wYXJhdG9yKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvckVhY2hJbk1lbW9yeTogZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhhdC5yb3dNb2RlbC5mb3JFYWNoSW5NZW1vcnkoY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0RmlsdGVyQXBpRm9yQ29sRGVmOiBmdW5jdGlvbihjb2xEZWYpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdhZy1ncmlkIEFQSSBtZXRob2QgZ2V0RmlsdGVyQXBpRm9yQ29sRGVmIGRlcHJlY2F0ZWQsIHVzZSBnZXRGaWx0ZXJBcGkgaW5zdGVhZCcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRGaWx0ZXJBcGkoY29sRGVmKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEZpbHRlckFwaTogZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSB0aGF0LmNvbHVtbk1vZGVsLmdldENvbHVtbihrZXkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5maWx0ZXJNYW5hZ2VyLmdldEZpbHRlckFwaShjb2x1bW4pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0Q29sdW1uRGVmOiBmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHRoYXQuY29sdW1uTW9kZWwuZ2V0Q29sdW1uKGtleSk7XHJcbiAgICAgICAgICAgIGlmIChjb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb2x1bW4uY29sRGVmO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRmlsdGVyQ2hhbmdlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQub25GaWx0ZXJDaGFuZ2VkKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTb3J0TW9kZWw6IGZ1bmN0aW9uKHNvcnRNb2RlbCkge1xyXG4gICAgICAgICAgICB0aGF0LnNldFNvcnRNb2RlbChzb3J0TW9kZWwpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0U29ydE1vZGVsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ2V0U29ydE1vZGVsKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRGaWx0ZXJNb2RlbDogZnVuY3Rpb24obW9kZWwpIHtcclxuICAgICAgICAgICAgdGhhdC5maWx0ZXJNYW5hZ2VyLnNldEZpbHRlck1vZGVsKG1vZGVsKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEZpbHRlck1vZGVsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ2V0RmlsdGVyTW9kZWwoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEZvY3VzZWRDZWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93UmVuZGVyZXIuZ2V0Rm9jdXNlZENlbGwoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldEZvY3VzZWRDZWxsOiBmdW5jdGlvbihyb3dJbmRleCwgY29sSW5kZXgpIHtcclxuICAgICAgICAgICAgdGhhdC5zZXRGb2N1c2VkQ2VsbChyb3dJbmRleCwgY29sSW5kZXgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2hvd1Rvb2xQYW5lbDogZnVuY3Rpb24oc2hvdykge1xyXG4gICAgICAgICAgICB0aGF0LnNob3dUb29sUGFuZWwoc2hvdyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1Rvb2xQYW5lbFNob3dpbmc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5pc1Rvb2xQYW5lbFNob3dpbmcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGhpZGVDb2x1bW46IGZ1bmN0aW9uKGNvbElkLCBoaWRlKSB7XHJcbiAgICAgICAgICAgIHRoYXQuY29sdW1uQ29udHJvbGxlci5oaWRlQ29sdW1ucyhbY29sSWRdLCBoaWRlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGhpZGVDb2x1bW5zOiBmdW5jdGlvbihjb2xJZHMsIGhpZGUpIHtcclxuICAgICAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLmhpZGVDb2x1bW5zKGNvbElkcywgaGlkZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnMuYXBpID0gYXBpO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuc2V0Rm9jdXNlZENlbGwgPSBmdW5jdGlvbihyb3dJbmRleCwgY29sSW5kZXgpIHtcclxuICAgIHRoaXMuZ3JpZFBhbmVsLmVuc3VyZUluZGV4VmlzaWJsZShyb3dJbmRleCk7XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5lbnN1cmVDb2xJbmRleFZpc2libGUoY29sSW5kZXgpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5zZXRGb2N1c2VkQ2VsbChyb3dJbmRleCwgY29sSW5kZXgpO1xyXG4gICAgfSwgMTApO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuZ2V0U29ydE1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgYWxsQ29sdW1ucyA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpO1xyXG4gICAgdmFyIGNvbHVtbnNXaXRoU29ydGluZyA9IFtdO1xyXG4gICAgdmFyIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpPGFsbENvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoYWxsQ29sdW1uc1tpXS5zb3J0KSB7XHJcbiAgICAgICAgICAgIGNvbHVtbnNXaXRoU29ydGluZy5wdXNoKGFsbENvbHVtbnNbaV0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbHVtbnNXaXRoU29ydGluZy5zb3J0KCBmdW5jdGlvbihhLGIpIHtcclxuICAgICAgICByZXR1cm4gYS5zb3J0ZWRBdCAtIGIuc29ydGVkQXQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgcmVzdWx0ID0gW107XHJcbiAgICBmb3IgKGkgPSAwOyBpPGNvbHVtbnNXaXRoU29ydGluZy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciByZXN1bHRFbnRyeSA9IHtcclxuICAgICAgICAgICAgZmllbGQ6IGNvbHVtbnNXaXRoU29ydGluZ1tpXS5jb2xEZWYuZmllbGQsXHJcbiAgICAgICAgICAgIHNvcnQ6IGNvbHVtbnNXaXRoU29ydGluZ1tpXS5zb3J0XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXN1bHQucHVzaChyZXN1bHRFbnRyeSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLnNldFNvcnRNb2RlbCA9IGZ1bmN0aW9uKHNvcnRNb2RlbCkge1xyXG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZVNvcnRpbmcoKSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogWW91IGFyZSBzZXR0aW5nIHRoZSBzb3J0IG1vZGVsIG9uIGEgZ3JpZCB0aGF0IGRvZXMgbm90IGhhdmUgc29ydGluZyBlbmFibGVkJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gZmlyc3QgdXAsIGNsZWFyIGFueSBwcmV2aW91cyBzb3J0XHJcbiAgICB2YXIgc29ydE1vZGVsUHJvdmlkZWQgPSBzb3J0TW9kZWwhPT1udWxsICYmIHNvcnRNb2RlbCE9PXVuZGVmaW5lZCAmJiBzb3J0TW9kZWwubGVuZ3RoPjA7XHJcbiAgICB2YXIgYWxsQ29sdW1ucyA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGk8YWxsQ29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2x1bW4gPSBhbGxDb2x1bW5zW2ldO1xyXG5cclxuICAgICAgICB2YXIgc29ydEZvckNvbCA9IG51bGw7XHJcbiAgICAgICAgdmFyIHNvcnRlZEF0ID0gLTE7XHJcbiAgICAgICAgaWYgKHNvcnRNb2RlbFByb3ZpZGVkICYmICFjb2x1bW4uY29sRGVmLnN1cHByZXNzU29ydGluZykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgajxzb3J0TW9kZWwubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBzb3J0TW9kZWxFbnRyeSA9IHNvcnRNb2RlbFtqXTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc29ydE1vZGVsRW50cnkuZmllbGQgPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgdHlwZW9mIGNvbHVtbi5jb2xEZWYuZmllbGQgPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgc29ydE1vZGVsRW50cnkuZmllbGQgPT09IGNvbHVtbi5jb2xEZWYuZmllbGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0Rm9yQ29sID0gc29ydE1vZGVsRW50cnkuc29ydDtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0ZWRBdCA9IGo7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzb3J0Rm9yQ29sKSB7XHJcbiAgICAgICAgICAgIGNvbHVtbi5zb3J0ID0gc29ydEZvckNvbDtcclxuICAgICAgICAgICAgY29sdW1uLnNvcnRlZEF0ID0gc29ydGVkQXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29sdW1uLnNvcnQgPSBudWxsO1xyXG4gICAgICAgICAgICBjb2x1bW4uc29ydGVkQXQgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm9uU29ydGluZ0NoYW5nZWQoKTtcclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLm9uU29ydGluZ0NoYW5nZWQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlU29ydEljb25zKCk7XHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVTZXJ2ZXJTaWRlU29ydGluZygpKSB7XHJcbiAgICAgICAgLy8gaWYgZG9pbmcgc2VydmVyIHNpZGUgc29ydGluZywgY2hhbmdpbmcgdGhlIHNvcnQgaGFzIHRoZSBpbXBhY3RcclxuICAgICAgICAvLyBvZiByZXNldHRpbmcgdGhlIGRhdGFzb3VyY2VcclxuICAgICAgICB0aGlzLnNldERhdGFzb3VyY2UoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gaWYgZG9pbmcgaW4gbWVtb3J5IHNvcnRpbmcsIHdlIGp1c3QgdXBkYXRlIHRoZSBpbiBtZW1vcnkgZGF0YVxyXG4gICAgICAgIHRoaXMudXBkYXRlTW9kZWxBbmRSZWZyZXNoKGNvbnN0YW50cy5TVEVQX1NPUlQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUuYWRkVmlydHVhbFJvd0xpc3RlbmVyID0gZnVuY3Rpb24ocm93SW5kZXgsIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAoIXRoaXMudmlydHVhbFJvd0NhbGxiYWNrc1tyb3dJbmRleF0pIHtcclxuICAgICAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdID0gW107XHJcbiAgICB9XHJcbiAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdLnB1c2goY2FsbGJhY2spO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUub25WaXJ0dWFsUm93U2VsZWN0ZWQgPSBmdW5jdGlvbihyb3dJbmRleCwgc2VsZWN0ZWQpIHtcclxuICAgIC8vIGluZm9ybSB0aGUgY2FsbGJhY2tzIG9mIHRoZSBldmVudFxyXG4gICAgaWYgKHRoaXMudmlydHVhbFJvd0NhbGxiYWNrc1tyb3dJbmRleF0pIHtcclxuICAgICAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjay5yb3dSZW1vdmVkID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5yb3dTZWxlY3RlZChzZWxlY3RlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLm9uVmlydHVhbFJvd1JlbW92ZWQgPSBmdW5jdGlvbihyb3dJbmRleCkge1xyXG4gICAgLy8gaW5mb3JtIHRoZSBjYWxsYmFja3Mgb2YgdGhlIGV2ZW50XHJcbiAgICBpZiAodGhpcy52aXJ0dWFsUm93Q2FsbGJhY2tzW3Jvd0luZGV4XSkge1xyXG4gICAgICAgIHRoaXMudmlydHVhbFJvd0NhbGxiYWNrc1tyb3dJbmRleF0uZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrLnJvd1JlbW92ZWQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJvd1JlbW92ZWQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLy8gcmVtb3ZlIHRoZSBjYWxsYmFja3NcclxuICAgIGRlbGV0ZSB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdO1xyXG59O1xyXG5cclxuR3JpZC5wcm90b3R5cGUub25OZXdDb2xzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnNldHVwQ29sdW1ucygpO1xyXG4gICAgdGhpcy51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfRVZFUllUSElORyk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS51cGRhdGVCb2R5Q29udGFpbmVyV2lkdGhBZnRlckNvbFJlc2l6ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5yb3dSZW5kZXJlci5zZXRNYWluUm93V2lkdGhzKCk7XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRCb2R5Q29udGFpbmVyV2lkdGgoKTtcclxufTtcclxuXHJcbkdyaWQucHJvdG90eXBlLnVwZGF0ZVBpbm5lZENvbENvbnRhaW5lcldpZHRoQWZ0ZXJDb2xSZXNpemUgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZ3JpZFBhbmVsLnNldFBpbm5lZENvbENvbnRhaW5lcldpZHRoKCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5kb0xheW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgc2V0VGltZW91dCh0aGlzLmRvTGF5b3V0Rm9yUmVhbC5iaW5kKHRoaXMpLCAwKTtcclxuICAgIHNldFRpbWVvdXQodGhpcy5kb0xheW91dEZvclJlYWwuYmluZCh0aGlzKSwgMTApO1xyXG4gICAgc2V0VGltZW91dCh0aGlzLmRvTGF5b3V0Rm9yUmVhbC5iaW5kKHRoaXMpLCAyMCk7XHJcbiAgICAvL3NldFRpbWVvdXQodGhpcy5kb0xheW91dEZvclJlYWwuYmluZCh0aGlzKSwgNTAwKTtcclxuICAgIHRoaXMuZG9MYXlvdXRGb3JSZWFsKCk7XHJcbn07XHJcblxyXG5HcmlkLnByb3RvdHlwZS5kb0xheW91dEZvclJlYWwgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIG5lZWQgdG8gZG8gbGF5b3V0IGZpcnN0LCBhcyBkcmF3VmlydHVhbFJvd3MgYW5kIHNldFBpbm5lZENvbEhlaWdodFxyXG4gICAgLy8gbmVlZCB0byBrbm93IHRoZSByZXN1bHQgb2YgdGhlIHJlc2l6aW5nIG9mIHRoZSBwYW5lbHMuXHJcbiAgICB0aGlzLmVSb290UGFuZWwuZG9MYXlvdXQoKTtcclxuICAgIC8vIGJvdGggb2YgdGhlIHR3byBiZWxvdyBzaG91bGQgYmUgZG9uZSBpbiBncmlkUGFuZWwsIHRoZSBncmlkUGFuZWwgc2hvdWxkIHJlZ2lzdGVyICdyZXNpemUnIHRvIHRoZSBwYW5lbFxyXG4gICAgdGhpcy5yb3dSZW5kZXJlci5kcmF3VmlydHVhbFJvd3MoKTtcclxuICAgIHRoaXMuZ3JpZFBhbmVsLnNldFBpbm5lZENvbEhlaWdodCgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHcmlkO1xyXG4iLCJ2YXIgREVGQVVMVF9ST1dfSEVJR0hUID0gMzA7XHJcblxyXG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxuZnVuY3Rpb24gR3JpZE9wdGlvbnNXcmFwcGVyKGdyaWRPcHRpb25zKSB7XHJcbiAgICB0aGlzLmdyaWRPcHRpb25zID0gZ3JpZE9wdGlvbnM7XHJcbiAgICB0aGlzLnNldHVwRGVmYXVsdHMoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNUcnVlKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09ICd0cnVlJztcclxufVxyXG5cclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1Jvd1NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dTZWxlY3Rpb24gPT09IFwic2luZ2xlXCIgfHwgdGhpcy5ncmlkT3B0aW9ucy5yb3dTZWxlY3Rpb24gPT09IFwibXVsdGlwbGVcIjsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1Jvd0Rlc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5yb3dEZXNlbGVjdGlvbik7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNSb3dTZWxlY3Rpb25NdWx0aSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dTZWxlY3Rpb24gPT09ICdtdWx0aXBsZSc7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5jb250ZXh0OyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzVmlydHVhbFBhZ2luZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMudmlydHVhbFBhZ2luZyk7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNTaG93VG9vbFBhbmVsID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5zaG93VG9vbFBhbmVsKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1Jvd3NBbHJlYWR5R3JvdXBlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMucm93c0FscmVhZHlHcm91cGVkKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1Jvd3NBbHJlYWR5RXhwYW5kZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLnJvd3NBbHJlYWR5RXhwYW5kZWQpOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBTZWxlY3RzQ2hpbGRyZW4gPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmdyb3VwU2VsZWN0c0NoaWxkcmVuKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0dyb3VwSW5jbHVkZUZvb3RlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBJbmNsdWRlRm9vdGVyKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzUm93Q2xpY2tTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLnN1cHByZXNzUm93Q2xpY2tTZWxlY3Rpb24pOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzU3VwcHJlc3NDZWxsU2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5zdXBwcmVzc0NlbGxTZWxlY3Rpb24pOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzU3VwcHJlc3NVblNvcnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLnN1cHByZXNzVW5Tb3J0KTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzTXVsdGlTb3J0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5zdXBwcmVzc011bHRpU29ydCk7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNHcm91cFN1cHByZXNzQXV0b0NvbHVtbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBTdXBwcmVzc0F1dG9Db2x1bW4pOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBIZWFkZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5ncm91cEhlYWRlcnMpOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRG9udFVzZVNjcm9sbHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmRvbnRVc2VTY3JvbGxzKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzRGVzY1NvcnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLnN1cHByZXNzRGVzY1NvcnQpOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFJvd1N0eWxlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd1N0eWxlOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFJvd0NsYXNzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0NsYXNzOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldEhlYWRlckNlbGxSZW5kZXJlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5oZWFkZXJDZWxsUmVuZGVyZXI7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0QXBpID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmFwaTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0VuYWJsZUNvbFJlc2l6ZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5lbmFibGVDb2xSZXNpemU7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0R3JvdXBEZWZhdWx0RXhwYW5kZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBEZWZhdWx0RXhwYW5kZWQ7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0R3JvdXBLZXlzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwS2V5czsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRHcm91cEFnZ0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwQWdnRnVuY3Rpb247IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0R3JvdXBBZ2dGaWVsZHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBBZ2dGaWVsZHM7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0QWxsUm93cyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dEYXRhOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBVc2VFbnRpcmVSb3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmdyb3VwVXNlRW50aXJlUm93KTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRHcm91cENvbHVtbkRlZiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5ncm91cENvbHVtbkRlZjsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0FuZ3VsYXJDb21waWxlUm93cyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuYW5ndWxhckNvbXBpbGVSb3dzKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0FuZ3VsYXJDb21waWxlRmlsdGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuYW5ndWxhckNvbXBpbGVGaWx0ZXJzKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0FuZ3VsYXJDb21waWxlSGVhZGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuYW5ndWxhckNvbXBpbGVIZWFkZXJzKTsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRDb2x1bW5EZWZzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNvbHVtbkRlZnM7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Um93SGVpZ2h0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0hlaWdodDsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRNb2RlbFVwZGF0ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMubW9kZWxVcGRhdGVkOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENlbGxDbGlja2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNlbGxDbGlja2VkOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENlbGxEb3VibGVDbGlja2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNlbGxEb3VibGVDbGlja2VkOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENlbGxWYWx1ZUNoYW5nZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuY2VsbFZhbHVlQ2hhbmdlZDsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRDZWxsRm9jdXNlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5jZWxsRm9jdXNlZDsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRSb3dTZWxlY3RlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dTZWxlY3RlZDsgfTtcclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRTZWxlY3Rpb25DaGFuZ2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnNlbGVjdGlvbkNoYW5nZWQ7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0VmlydHVhbFJvd1JlbW92ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMudmlydHVhbFJvd1JlbW92ZWQ7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0RGF0YXNvdXJjZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5kYXRhc291cmNlOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFJlYWR5ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJlYWR5OyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFJvd0J1ZmZlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dCdWZmZXI7IH07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldEdyb3VwUm93SW5uZXJSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBJbm5lclJlbmRlcmVyKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdhZy1ncmlkOiBhcyBvZiB2MS4xMC4wICgyMXN0IEp1biAyMDE1KSBncm91cElubmVyUmVuZGVyZXIgaXMgbndvIGNhbGxlZCBncm91cFJvd0lubmVyUmVuZGVyZXIuIFBsZWFzZSBjaGFuZ2UgeW91IGNvZGUgYXMgZ3JvdXBJbm5lclJlbmRlcmVyIGlzIGRlcHJlY2F0ZWQuJyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBJbm5lclJlbmRlcmVyO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5ncm91cFJvd0lubmVyUmVuZGVyZXI7XHJcbiAgICB9XHJcbn07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENvbFdpZHRoID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodHlwZW9mIHRoaXMuZ3JpZE9wdGlvbnMuY29sV2lkdGggIT09ICdudW1iZXInIHx8ICB0aGlzLmdyaWRPcHRpb25zLmNvbFdpZHRoIDwgY29uc3RhbnRzLk1JTl9DT0xfV0lEVEgpIHtcclxuICAgICAgICByZXR1cm4gMjAwO1xyXG4gICAgfSBlbHNlICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuY29sV2lkdGg7XHJcbiAgICB9XHJcbn07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRW5hYmxlU29ydGluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU29ydGluZykgfHwgaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU2VydmVyU2lkZVNvcnRpbmcpOyB9O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmVuYWJsZVNlcnZlclNpZGVTb3J0aW5nKTsgfTtcclxuXHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNFbmFibGVGaWx0ZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmVuYWJsZUZpbHRlcikgfHwgaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU2VydmVyU2lkZUZpbHRlcik7IH07XHJcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNFbmFibGVTZXJ2ZXJTaWRlRmlsdGVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmVuYWJsZVNlcnZlclNpZGVGaWx0ZXI7IH07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLnNldFNlbGVjdGVkUm93cyA9IGZ1bmN0aW9uKG5ld1NlbGVjdGVkUm93cykge1xyXG4gICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRSb3dzID0gbmV3U2VsZWN0ZWRSb3dzO1xyXG59O1xyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLnNldFNlbGVjdGVkTm9kZXNCeUlkID0gZnVuY3Rpb24obmV3U2VsZWN0ZWROb2Rlcykge1xyXG4gICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuc2VsZWN0ZWROb2Rlc0J5SWQgPSBuZXdTZWxlY3RlZE5vZGVzO1xyXG59O1xyXG5cclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRJY29ucyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuaWNvbnM7XHJcbn07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRG9JbnRlcm5hbEV4cGFuZGluZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuICF0aGlzLmlzUm93c0FscmVhZHlFeHBhbmRlZCgpICYmIHRoaXMuZ3JpZE9wdGlvbnMuZXhwYW5kUm93O1xyXG59O1xyXG5cclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRIZWFkZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcclxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9ucy5oZWFkZXJIZWlnaHQgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgLy8gaWYgaGVhZGVyIGhlaWdodCBwcm92aWRlZCwgdXNlZCBpdFxyXG4gICAgICAgIHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmhlYWRlckhlaWdodDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHJldHVybiAyNSBpZiBubyBncm91cGluZywgNTAgaWYgZ3JvdXBpbmdcclxuICAgICAgICBpZiAodGhpcy5pc0dyb3VwSGVhZGVycygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiA1MDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gMjU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5zZXR1cERlZmF1bHRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnMucm93SGVpZ2h0KSB7XHJcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9ucy5yb3dIZWlnaHQgPSBERUZBVUxUX1JPV19IRUlHSFQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFBpbm5lZENvbENvdW50ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBpZiBub3QgdXNpbmcgc2Nyb2xscywgdGhlbiBwaW5uZWQgY29sdW1ucyBkb2Vzbid0IG1ha2VcclxuICAgIC8vIHNlbnNlLCBzbyBhbHdheXMgcmV0dXJuIDBcclxuICAgIGlmICh0aGlzLmlzRG9udFVzZVNjcm9sbHMoKSkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnMucGlubmVkQ29sdW1uQ291bnQpIHtcclxuICAgICAgICAvL2luIGNhc2UgdXNlciBwdXRzIGluIGEgc3RyaW5nLCBjYXN0IHRvIG51bWJlclxyXG4gICAgICAgIHJldHVybiBOdW1iZXIodGhpcy5ncmlkT3B0aW9ucy5waW5uZWRDb2x1bW5Db3VudCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRMb2NhbGVUZXh0RnVuYyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChrZXksIGRlZmF1bHRWYWx1ZSkge1xyXG4gICAgICAgIHZhciBsb2NhbGVUZXh0ID0gdGhhdC5ncmlkT3B0aW9ucy5sb2NhbGVUZXh0O1xyXG4gICAgICAgIGlmIChsb2NhbGVUZXh0ICYmIGxvY2FsZVRleHRba2V5XSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlVGV4dFtrZXldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj48ZGl2IGNsYXNzPWFnLWhlYWRlcj48ZGl2IGNsYXNzPWFnLXBpbm5lZC1oZWFkZXI+PC9kaXY+PGRpdiBjbGFzcz1hZy1oZWFkZXItdmlld3BvcnQ+PGRpdiBjbGFzcz1hZy1oZWFkZXItY29udGFpbmVyPjwvZGl2PjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keT48ZGl2IGNsYXNzPWFnLXBpbm5lZC1jb2xzLXZpZXdwb3J0PjxkaXYgY2xhc3M9YWctcGlubmVkLWNvbHMtY29udGFpbmVyPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keS12aWV3cG9ydC13cmFwcGVyPjxkaXYgY2xhc3M9YWctYm9keS12aWV3cG9ydD48ZGl2IGNsYXNzPWFnLWJvZHktY29udGFpbmVyPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+PGRpdiBjbGFzcz1hZy1oZWFkZXItY29udGFpbmVyPjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keS1jb250YWluZXI+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgZ3JpZEh0bWwgPSByZXF1aXJlKCcuL2dyaWQuaHRtbCcpO1xyXG52YXIgZ3JpZE5vU2Nyb2xsc0h0bWwgPSByZXF1aXJlKCcuL2dyaWROb1Njcm9sbHMuaHRtbCcpO1xyXG52YXIgbG9hZGluZ0h0bWwgPSByZXF1aXJlKCcuL2xvYWRpbmcuaHRtbCcpO1xyXG52YXIgQm9yZGVyTGF5b3V0ID0gcmVxdWlyZSgnLi4vbGF5b3V0L2JvcmRlckxheW91dCcpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gR3JpZFBhbmVsKGdyaWRPcHRpb25zV3JhcHBlcikge1xyXG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XHJcbiAgICAvLyBtYWtlcyBjb2RlIGJlbG93IG1vcmUgcmVhZGFibGUgaWYgd2UgcHVsbCAnZm9yUHJpbnQnIG91dFxyXG4gICAgdGhpcy5mb3JQcmludCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKTtcclxuICAgIHRoaXMuc2V0dXBDb21wb25lbnRzKCk7XHJcbiAgICB0aGlzLnNjcm9sbFdpZHRoID0gdXRpbHMuZ2V0U2Nyb2xsYmFyV2lkdGgoKTtcclxufVxyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5zZXR1cENvbXBvbmVudHMgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICBpZiAodGhpcy5mb3JQcmludCkge1xyXG4gICAgICAgIHRoaXMuZVJvb3QgPSB1dGlscy5sb2FkVGVtcGxhdGUoZ3JpZE5vU2Nyb2xsc0h0bWwpO1xyXG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKHRoaXMuZVJvb3QsICdhZy1yb290IGFnLW5vLXNjcm9sbHMnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5lUm9vdCA9IHV0aWxzLmxvYWRUZW1wbGF0ZShncmlkSHRtbCk7XHJcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3ModGhpcy5lUm9vdCwgJ2FnLXJvb3QgYWctc2Nyb2xscycpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZmluZEVsZW1lbnRzKCk7XHJcblxyXG4gICAgdGhpcy5sYXlvdXQgPSBuZXcgQm9yZGVyTGF5b3V0KHtcclxuICAgICAgICBvdmVybGF5OiB1dGlscy5sb2FkVGVtcGxhdGUobG9hZGluZ0h0bWwpLFxyXG4gICAgICAgIGNlbnRlcjogdGhpcy5lUm9vdCxcclxuICAgICAgICBkb250RmlsbDogdGhpcy5mb3JQcmludCxcclxuICAgICAgICBuYW1lOiAnZUdyaWRQYW5lbCdcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkU2Nyb2xsTGlzdGVuZXIoKTtcclxufTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuZW5zdXJlSW5kZXhWaXNpYmxlID0gZnVuY3Rpb24oaW5kZXgpIHtcclxuICAgIHZhciBsYXN0Um93ID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93Q291bnQoKTtcclxuICAgIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInIHx8IGluZGV4IDwgMCB8fCBpbmRleCA+PSBsYXN0Um93KSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdpbnZhbGlkIHJvdyBpbmRleCBmb3IgZW5zdXJlSW5kZXhWaXNpYmxlOiAnICsgaW5kZXgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm93SGVpZ2h0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93SGVpZ2h0KCk7XHJcbiAgICB2YXIgcm93VG9wUGl4ZWwgPSByb3dIZWlnaHQgKiBpbmRleDtcclxuICAgIHZhciByb3dCb3R0b21QaXhlbCA9IHJvd1RvcFBpeGVsICsgcm93SGVpZ2h0O1xyXG5cclxuICAgIHZhciB2aWV3cG9ydFRvcFBpeGVsID0gdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbFRvcDtcclxuICAgIHZhciB2aWV3cG9ydEhlaWdodCA9IHRoaXMuZUJvZHlWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XHJcbiAgICB2YXIgc2Nyb2xsU2hvd2luZyA9IHRoaXMuZUJvZHlWaWV3cG9ydC5jbGllbnRXaWR0aCA8IHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxXaWR0aDtcclxuICAgIGlmIChzY3JvbGxTaG93aW5nKSB7XHJcbiAgICAgICAgdmlld3BvcnRIZWlnaHQgLT0gdGhpcy5zY3JvbGxXaWR0aDtcclxuICAgIH1cclxuICAgIHZhciB2aWV3cG9ydEJvdHRvbVBpeGVsID0gdmlld3BvcnRUb3BQaXhlbCArIHZpZXdwb3J0SGVpZ2h0O1xyXG5cclxuICAgIHZhciB2aWV3cG9ydFNjcm9sbGVkUGFzdFJvdyA9IHZpZXdwb3J0VG9wUGl4ZWwgPiByb3dUb3BQaXhlbDtcclxuICAgIHZhciB2aWV3cG9ydFNjcm9sbGVkQmVmb3JlUm93ID0gdmlld3BvcnRCb3R0b21QaXhlbCA8IHJvd0JvdHRvbVBpeGVsO1xyXG5cclxuICAgIGlmICh2aWV3cG9ydFNjcm9sbGVkUGFzdFJvdykge1xyXG4gICAgICAgIC8vIGlmIHJvdyBpcyBiZWZvcmUsIHNjcm9sbCB1cCB3aXRoIHJvdyBhdCB0b3BcclxuICAgICAgICB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsVG9wID0gcm93VG9wUGl4ZWw7XHJcbiAgICB9IGVsc2UgaWYgKHZpZXdwb3J0U2Nyb2xsZWRCZWZvcmVSb3cpIHtcclxuICAgICAgICAvLyBpZiByb3cgaXMgYmVsb3csIHNjcm9sbCBkb3duIHdpdGggcm93IGF0IGJvdHRvbVxyXG4gICAgICAgIHZhciBuZXdTY3JvbGxQb3NpdGlvbiA9IHJvd0JvdHRvbVBpeGVsIC0gdmlld3BvcnRIZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbFRvcCA9IG5ld1Njcm9sbFBvc2l0aW9uO1xyXG4gICAgfVxyXG4gICAgLy8gb3RoZXJ3aXNlLCByb3cgaXMgYWxyZWFkeSBpbiB2aWV3LCBzbyBkbyBub3RoaW5nXHJcbn07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLmVuc3VyZUNvbEluZGV4VmlzaWJsZSA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykge1xyXG4gICAgICAgIGNvbnNvbGUud2FybignY29sIGluZGV4IG11c3QgYmUgYSBudW1iZXI6ICcgKyBpbmRleCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKCk7XHJcbiAgICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJyB8fCBpbmRleCA8IDAgfHwgaW5kZXggPj0gY29sdW1ucy5sZW5ndGgpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ2ludmFsaWQgY29sIGluZGV4IGZvciBlbnN1cmVDb2xJbmRleFZpc2libGU6ICcgKyBpbmRleFxyXG4gICAgICAgICAgICArICcsIHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kICcgKyAoY29sdW1ucy5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjb2x1bW4gPSBjb2x1bW5zW2luZGV4XTtcclxuICAgIHZhciBwaW5uZWRDb2xDb3VudCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFBpbm5lZENvbENvdW50KCk7XHJcbiAgICBpZiAoaW5kZXggPCBwaW5uZWRDb2xDb3VudCkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybignaW52YWxpZCBjb2wgaW5kZXggZm9yIGVuc3VyZUNvbEluZGV4VmlzaWJsZTogJyArIGluZGV4XHJcbiAgICAgICAgICAgICsgJywgc2Nyb2xsaW5nIHRvIGEgcGlubmVkIGNvbCBtYWtlcyBubyBzZW5zZScpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzdW0gdXAgYWxsIGNvbCB3aWR0aCB0byB0aGUgbGV0IHRvIGdldCB0aGUgc3RhcnQgcGl4ZWxcclxuICAgIHZhciBjb2xMZWZ0UGl4ZWwgPSAwO1xyXG4gICAgZm9yICh2YXIgaSA9IHBpbm5lZENvbENvdW50OyBpPGluZGV4OyBpKyspIHtcclxuICAgICAgICBjb2xMZWZ0UGl4ZWwgKz0gY29sdW1uc1tpXS5hY3R1YWxXaWR0aDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY29sUmlnaHRQaXhlbCA9IGNvbExlZnRQaXhlbCArIGNvbHVtbi5hY3R1YWxXaWR0aDtcclxuXHJcbiAgICB2YXIgdmlld3BvcnRMZWZ0UGl4ZWwgPSB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsTGVmdDtcclxuICAgIHZhciB2aWV3cG9ydFdpZHRoID0gdGhpcy5lQm9keVZpZXdwb3J0Lm9mZnNldFdpZHRoO1xyXG5cclxuICAgIHZhciBzY3JvbGxTaG93aW5nID0gdGhpcy5lQm9keVZpZXdwb3J0LmNsaWVudEhlaWdodCA8IHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxIZWlnaHQ7XHJcbiAgICBpZiAoc2Nyb2xsU2hvd2luZykge1xyXG4gICAgICAgIHZpZXdwb3J0V2lkdGggLT0gdGhpcy5zY3JvbGxXaWR0aDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdmlld3BvcnRSaWdodFBpeGVsID0gdmlld3BvcnRMZWZ0UGl4ZWwgKyB2aWV3cG9ydFdpZHRoO1xyXG5cclxuICAgIHZhciB2aWV3cG9ydFNjcm9sbGVkUGFzdENvbCA9IHZpZXdwb3J0TGVmdFBpeGVsID4gY29sTGVmdFBpeGVsO1xyXG4gICAgdmFyIHZpZXdwb3J0U2Nyb2xsZWRCZWZvcmVDb2wgPSB2aWV3cG9ydFJpZ2h0UGl4ZWwgPCBjb2xSaWdodFBpeGVsO1xyXG5cclxuICAgIGlmICh2aWV3cG9ydFNjcm9sbGVkUGFzdENvbCkge1xyXG4gICAgICAgIC8vIGlmIHZpZXdwb3J0J3MgbGVmdCBzaWRlIGlzIGFmdGVyIGNvbCdzIGxlZnQgc2lkZSwgc2Nyb2xsIHJpZ2h0IHRvIHB1bGwgY29sIGludG8gdmlld3BvcnQgYXQgbGVmdFxyXG4gICAgICAgIHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxMZWZ0ID0gY29sTGVmdFBpeGVsO1xyXG4gICAgfSBlbHNlIGlmICh2aWV3cG9ydFNjcm9sbGVkQmVmb3JlQ29sKSB7XHJcbiAgICAgICAgLy8gaWYgdmlld3BvcnQncyByaWdodCBzaWRlIGlzIGJlZm9yZSBjb2wncyByaWdodCBzaWRlLCBzY3JvbGwgbGVmdCB0byBwdWxsIGNvbCBpbnRvIHZpZXdwb3J0IGF0IHJpZ2h0XHJcbiAgICAgICAgdmFyIG5ld1Njcm9sbFBvc2l0aW9uID0gY29sUmlnaHRQaXhlbCAtIHZpZXdwb3J0V2lkdGg7XHJcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbExlZnQgPSBuZXdTY3JvbGxQb3NpdGlvbjtcclxuICAgIH1cclxuICAgIC8vIG90aGVyd2lzZSwgY29sIGlzIGFscmVhZHkgaW4gdmlldywgc28gZG8gbm90aGluZ1xyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5zaG93TG9hZGluZyA9IGZ1bmN0aW9uKGxvYWRpbmcpIHtcclxuICAgIHRoaXMubGF5b3V0LnNldE92ZXJsYXlWaXNpYmxlKGxvYWRpbmcpO1xyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aEZvclNpemVDb2xzVG9GaXQgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHRoaXMuZUJvZHkuY2xpZW50V2lkdGg7XHJcbiAgICB2YXIgc2Nyb2xsU2hvd2luZyA9IHRoaXMuZUJvZHlWaWV3cG9ydC5jbGllbnRIZWlnaHQgPCB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsSGVpZ2h0O1xyXG4gICAgaWYgKHNjcm9sbFNob3dpbmcpIHtcclxuICAgICAgICBhdmFpbGFibGVXaWR0aCAtPSB0aGlzLnNjcm9sbFdpZHRoO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGF2YWlsYWJsZVdpZHRoO1xyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oY29sdW1uTW9kZWwsIHJvd1JlbmRlcmVyKSB7XHJcbiAgICB0aGlzLmNvbHVtbk1vZGVsID0gY29sdW1uTW9kZWw7XHJcbiAgICB0aGlzLnJvd1JlbmRlcmVyID0gcm93UmVuZGVyZXI7XHJcbn07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLnNldFJvd01vZGVsID0gZnVuY3Rpb24ocm93TW9kZWwpIHtcclxuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcclxufTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0Qm9keUNvbnRhaW5lciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5lQm9keUNvbnRhaW5lcjsgfTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0Qm9keVZpZXdwb3J0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVCb2R5Vmlld3BvcnQ7IH07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLmdldFBpbm5lZENvbHNDb250YWluZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXI7IH07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLmdldEhlYWRlckNvbnRhaW5lciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5lSGVhZGVyQ29udGFpbmVyOyB9O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRSb290ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVSb290OyB9O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRQaW5uZWRIZWFkZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZVBpbm5lZEhlYWRlcjsgfTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0SGVhZGVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVIZWFkZXI7IH07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLmdldFJvd3NQYXJlbnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZVBhcmVudE9mUm93czsgfTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuZmluZEVsZW1lbnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5mb3JQcmludCkge1xyXG4gICAgICAgIHRoaXMuZUhlYWRlckNvbnRhaW5lciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1oZWFkZXItY29udGFpbmVyXCIpO1xyXG4gICAgICAgIHRoaXMuZUJvZHlDb250YWluZXIgPSB0aGlzLmVSb290LnF1ZXJ5U2VsZWN0b3IoXCIuYWctYm9keS1jb250YWluZXJcIik7XHJcbiAgICAgICAgLy8gZm9yIG5vLXNjcm9sbHMsIGFsbCByb3dzIGxpdmUgaW4gdGhlIGJvZHkgY29udGFpbmVyXHJcbiAgICAgICAgdGhpcy5lUGFyZW50T2ZSb3dzID0gdGhpcy5lQm9keUNvbnRhaW5lcjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5lQm9keSA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1ib2R5XCIpO1xyXG4gICAgICAgIHRoaXMuZUJvZHlDb250YWluZXIgPSB0aGlzLmVSb290LnF1ZXJ5U2VsZWN0b3IoXCIuYWctYm9keS1jb250YWluZXJcIik7XHJcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0ID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLWJvZHktdmlld3BvcnRcIik7XHJcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0V3JhcHBlciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1ib2R5LXZpZXdwb3J0LXdyYXBwZXJcIik7XHJcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1waW5uZWQtY29scy1jb250YWluZXJcIik7XHJcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc1ZpZXdwb3J0ID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLXBpbm5lZC1jb2xzLXZpZXdwb3J0XCIpO1xyXG4gICAgICAgIHRoaXMuZVBpbm5lZEhlYWRlciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1waW5uZWQtaGVhZGVyXCIpO1xyXG4gICAgICAgIHRoaXMuZUhlYWRlciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1oZWFkZXJcIik7XHJcbiAgICAgICAgdGhpcy5lSGVhZGVyQ29udGFpbmVyID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLWhlYWRlci1jb250YWluZXJcIik7XHJcbiAgICAgICAgLy8gZm9yIHNjcm9sbHMsIGFsbCByb3dzIGxpdmUgaW4gZUJvZHkgKGNvbnRhaW5pbmcgcGlubmVkIGFuZCBub3JtYWwgYm9keSlcclxuICAgICAgICB0aGlzLmVQYXJlbnRPZlJvd3MgPSB0aGlzLmVCb2R5O1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5zZXRCb2R5Q29udGFpbmVyV2lkdGggPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBtYWluUm93V2lkdGggPSB0aGlzLmNvbHVtbk1vZGVsLmdldEJvZHlDb250YWluZXJXaWR0aCgpICsgXCJweFwiO1xyXG4gICAgdGhpcy5lQm9keUNvbnRhaW5lci5zdHlsZS53aWR0aCA9IG1haW5Sb3dXaWR0aDtcclxufTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuc2V0UGlubmVkQ29sQ29udGFpbmVyV2lkdGggPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBwaW5uZWRDb2xXaWR0aCA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0UGlubmVkQ29udGFpbmVyV2lkdGgoKSArIFwicHhcIjtcclxuICAgIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIuc3R5bGUud2lkdGggPSBwaW5uZWRDb2xXaWR0aDtcclxuICAgIHRoaXMuZUJvZHlWaWV3cG9ydFdyYXBwZXIuc3R5bGUubWFyZ2luTGVmdCA9IHBpbm5lZENvbFdpZHRoO1xyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5zaG93UGlubmVkQ29sQ29udGFpbmVyc0lmTmVlZGVkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBubyBuZWVkIHRvIGRvIHRoaXMgaWYgbm90IHVzaW5nIHNjcm9sbHNcclxuICAgIGlmICh0aGlzLmZvclByaW50KSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzaG93aW5nUGlubmVkQ29scyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFBpbm5lZENvbENvdW50KCkgPiAwO1xyXG5cclxuICAgIC8vc29tZSBicm93c2VycyBoYWQgbGF5b3V0IGlzc3VlcyB3aXRoIHRoZSBibGFuayBkaXZzLCBzbyBpZiBibGFuayxcclxuICAgIC8vd2UgZG9uJ3QgZGlzcGxheSB0aGVtXHJcbiAgICBpZiAoc2hvd2luZ1Bpbm5lZENvbHMpIHtcclxuICAgICAgICB0aGlzLmVQaW5uZWRIZWFkZXIuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xyXG4gICAgICAgIHRoaXMuZVBpbm5lZENvbHNWaWV3cG9ydC5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZSc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuZVBpbm5lZEhlYWRlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMuZVBpbm5lZENvbHNWaWV3cG9ydC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfVxyXG59O1xyXG5cclxuR3JpZFBhbmVsLnByb3RvdHlwZS5zZXRIZWFkZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBoZWFkZXJIZWlnaHQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRIZWFkZXJIZWlnaHQoKTtcclxuICAgIHZhciBoZWFkZXJIZWlnaHRQaXhlbHMgPSBoZWFkZXJIZWlnaHQgKyAncHgnO1xyXG4gICAgaWYgKHRoaXMuZm9yUHJpbnQpIHtcclxuICAgICAgICB0aGlzLmVIZWFkZXJDb250YWluZXIuc3R5bGVbJ2hlaWdodCddID0gaGVhZGVySGVpZ2h0UGl4ZWxzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmVIZWFkZXIuc3R5bGVbJ2hlaWdodCddID0gaGVhZGVySGVpZ2h0UGl4ZWxzO1xyXG4gICAgICAgIHRoaXMuZUJvZHkuc3R5bGVbJ3BhZGRpbmdUb3AnXSA9IGhlYWRlckhlaWdodFBpeGVscztcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHNlZSBpZiBhIGdyZXkgYm94IGlzIG5lZWRlZCBhdCB0aGUgYm90dG9tIG9mIHRoZSBwaW5uZWQgY29sXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuc2V0UGlubmVkQ29sSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAoIXRoaXMuZm9yUHJpbnQpIHtcclxuICAgICAgICB2YXIgYm9keUhlaWdodCA9IHRoaXMuZUJvZHlWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc1ZpZXdwb3J0LnN0eWxlLmhlaWdodCA9IGJvZHlIZWlnaHQgKyBcInB4XCI7XHJcbiAgICB9XHJcbn07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLmFkZFNjcm9sbExpc3RlbmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBpZiBwcmludGluZywgdGhlbiBubyBzY3JvbGxpbmcsIHNvIG5vIHBvaW50IGluIGxpc3RlbmluZyBmb3Igc2Nyb2xsIGV2ZW50c1xyXG4gICAgaWYgKHRoaXMuZm9yUHJpbnQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIGxhc3RMZWZ0UG9zaXRpb24gPSAtMTtcclxuICAgIHZhciBsYXN0VG9wUG9zaXRpb24gPSAtMTtcclxuXHJcbiAgICB0aGlzLmVCb2R5Vmlld3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbmV3TGVmdFBvc2l0aW9uID0gdGhhdC5lQm9keVZpZXdwb3J0LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgdmFyIG5ld1RvcFBvc2l0aW9uID0gdGhhdC5lQm9keVZpZXdwb3J0LnNjcm9sbFRvcDtcclxuXHJcbiAgICAgICAgaWYgKG5ld0xlZnRQb3NpdGlvbiAhPT0gbGFzdExlZnRQb3NpdGlvbikge1xyXG4gICAgICAgICAgICBsYXN0TGVmdFBvc2l0aW9uID0gbmV3TGVmdFBvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGF0LnNjcm9sbEhlYWRlcihuZXdMZWZ0UG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5ld1RvcFBvc2l0aW9uICE9PSBsYXN0VG9wUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgbGFzdFRvcFBvc2l0aW9uID0gbmV3VG9wUG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoYXQuc2Nyb2xsUGlubmVkKG5ld1RvcFBvc2l0aW9uKTtcclxuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5kcmF3VmlydHVhbFJvd3MoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmVQaW5uZWRDb2xzVmlld3BvcnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyB0aGlzIG1lYW5zIHRoZSBwaW5uZWQgcGFuZWwgd2FzIG1vdmVkLCB3aGljaCBjYW4gb25seVxyXG4gICAgICAgIC8vIGhhcHBlbiB3aGVuIHRoZSB1c2VyIGlzIG5hdmlnYXRpbmcgaW4gdGhlIHBpbm5lZCBjb250YWluZXJcclxuICAgICAgICAvLyBhcyB0aGUgcGlubmVkIGNvbCBzaG91bGQgbmV2ZXIgc2Nyb2xsLiBzbyB3ZSByb2xsYmFja1xyXG4gICAgICAgIC8vIHRoZSBzY3JvbGwgb24gdGhlIHBpbm5lZC5cclxuICAgICAgICB0aGF0LmVQaW5uZWRDb2xzVmlld3BvcnQuc2Nyb2xsVG9wID0gMDtcclxuICAgIH0pO1xyXG5cclxufTtcclxuXHJcbkdyaWRQYW5lbC5wcm90b3R5cGUuc2Nyb2xsSGVhZGVyID0gZnVuY3Rpb24oYm9keUxlZnRQb3NpdGlvbikge1xyXG4gICAgLy8gdGhpcy5lSGVhZGVyQ29udGFpbmVyLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgnICsgLWJvZHlMZWZ0UG9zaXRpb24gKyBcInB4LDAsMClcIjtcclxuICAgIHRoaXMuZUhlYWRlckNvbnRhaW5lci5zdHlsZS5sZWZ0ID0gLWJvZHlMZWZ0UG9zaXRpb24gKyBcInB4XCI7XHJcbn07XHJcblxyXG5HcmlkUGFuZWwucHJvdG90eXBlLnNjcm9sbFBpbm5lZCA9IGZ1bmN0aW9uKGJvZHlUb3BQb3NpdGlvbikge1xyXG4gICAgLy8gdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwnICsgLWJvZHlUb3BQb3NpdGlvbiArIFwicHgsMClcIjtcclxuICAgIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIuc3R5bGUudG9wID0gLWJvZHlUb3BQb3NpdGlvbiArIFwicHhcIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR3JpZFBhbmVsOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPWFnLWxvYWRpbmctcGFuZWw+PGRpdiBjbGFzcz1hZy1sb2FkaW5nLXdyYXBwZXI+PHNwYW4gY2xhc3M9YWctbG9hZGluZy1jZW50ZXI+TG9hZGluZy4uLjwvc3Bhbj48L2Rpdj48L2Rpdj5cIjtcbiIsImZ1bmN0aW9uIEdyb3VwQ3JlYXRvcigpIHt9XHJcblxyXG5Hcm91cENyZWF0b3IucHJvdG90eXBlLmdyb3VwID0gZnVuY3Rpb24ocm93Tm9kZXMsIGdyb3VwZWRDb2xzLCBncm91cEFnZ0Z1bmN0aW9uLCBleHBhbmRCeURlZmF1bHQpIHtcclxuXHJcbiAgICB2YXIgdG9wTW9zdEdyb3VwID0ge1xyXG4gICAgICAgIGxldmVsOiAtMSxcclxuICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgY2hpbGRyZW5NYXA6IHt9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBhbGxHcm91cHMgPSBbXTtcclxuICAgIGFsbEdyb3Vwcy5wdXNoKHRvcE1vc3RHcm91cCk7XHJcblxyXG4gICAgdmFyIGxldmVsVG9JbnNlcnRDaGlsZCA9IGdyb3VwZWRDb2xzLmxlbmd0aCAtIDE7XHJcbiAgICB2YXIgaSwgY3VycmVudExldmVsLCBub2RlLCBkYXRhLCBjdXJyZW50R3JvdXAsIGdyb3VwQnlGaWVsZCwgZ3JvdXBLZXksIG5leHRHcm91cDtcclxuXHJcbiAgICAvLyBzdGFydCBhdCAtMSBhbmQgZ28gYmFja3dhcmRzLCBhcyBhbGwgdGhlIHBvc2l0aXZlIGluZGV4ZXNcclxuICAgIC8vIGFyZSBhbHJlYWR5IHVzZWQgYnkgdGhlIG5vZGVzLlxyXG4gICAgdmFyIGluZGV4ID0gLTE7XHJcblxyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvd05vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgbm9kZSA9IHJvd05vZGVzW2ldO1xyXG4gICAgICAgIGRhdGEgPSBub2RlLmRhdGE7XHJcblxyXG4gICAgICAgIC8vIGFsbCBsZWFmIG5vZGVzIGhhdmUgdGhlIHNhbWUgbGV2ZWwgaW4gdGhpcyBncm91cGluZywgd2hpY2ggaXMgb25lIGxldmVsIGFmdGVyIHRoZSBsYXN0IGdyb3VwXHJcbiAgICAgICAgbm9kZS5sZXZlbCA9IGxldmVsVG9JbnNlcnRDaGlsZCArIDE7XHJcblxyXG4gICAgICAgIGZvciAoY3VycmVudExldmVsID0gMDsgY3VycmVudExldmVsIDwgZ3JvdXBlZENvbHMubGVuZ3RoOyBjdXJyZW50TGV2ZWwrKykge1xyXG4gICAgICAgICAgICBncm91cEJ5RmllbGQgPSBncm91cGVkQ29sc1tjdXJyZW50TGV2ZWxdLmNvbERlZi5maWVsZDtcclxuICAgICAgICAgICAgZ3JvdXBLZXkgPSBkYXRhW2dyb3VwQnlGaWVsZF07XHJcblxyXG4gICAgICAgICAgICBpZiAoY3VycmVudExldmVsID09IDApIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cCA9IHRvcE1vc3RHcm91cDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaWYgZ3JvdXAgZG9lc24ndCBleGlzdCB5ZXQsIGNyZWF0ZSBpdFxyXG4gICAgICAgICAgICBuZXh0R3JvdXAgPSBjdXJyZW50R3JvdXAuY2hpbGRyZW5NYXBbZ3JvdXBLZXldO1xyXG4gICAgICAgICAgICBpZiAoIW5leHRHcm91cCkge1xyXG4gICAgICAgICAgICAgICAgbmV4dEdyb3VwID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkOiBncm91cEJ5RmllbGQsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGluZGV4LS0sXHJcbiAgICAgICAgICAgICAgICAgICAga2V5OiBncm91cEtleSxcclxuICAgICAgICAgICAgICAgICAgICBleHBhbmRlZDogdGhpcy5pc0V4cGFuZGVkKGV4cGFuZEJ5RGVmYXVsdCwgY3VycmVudExldmVsKSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIHRvcCBtb3N0IGxldmVsLCBwYXJlbnQgaXMgbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3VycmVudEdyb3VwID09PSB0b3BNb3N0R3JvdXAgPyBudWxsIDogY3VycmVudEdyb3VwLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbENoaWxkcmVuQ291bnQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IGN1cnJlbnRHcm91cC5sZXZlbCArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW5NYXA6IHt9IC8vdGhpcyBpcyBhIHRlbXBvcmFyeSBtYXAsIHdlIHJlbW92ZSBhdCB0aGUgZW5kIG9mIHRoaXMgbWV0aG9kXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEdyb3VwLmNoaWxkcmVuTWFwW2dyb3VwS2V5XSA9IG5leHRHcm91cDtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cC5jaGlsZHJlbi5wdXNoKG5leHRHcm91cCk7XHJcbiAgICAgICAgICAgICAgICBhbGxHcm91cHMucHVzaChuZXh0R3JvdXApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZXh0R3JvdXAuYWxsQ2hpbGRyZW5Db3VudCsrO1xyXG5cclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRMZXZlbCA9PSBsZXZlbFRvSW5zZXJ0Q2hpbGQpIHtcclxuICAgICAgICAgICAgICAgIG5vZGUucGFyZW50ID0gbmV4dEdyb3VwID09PSB0b3BNb3N0R3JvdXAgPyBudWxsIDogbmV4dEdyb3VwO1xyXG4gICAgICAgICAgICAgICAgbmV4dEdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50R3JvdXAgPSBuZXh0R3JvdXA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vcmVtb3ZlIHRoZSB0ZW1wb3JhcnkgbWFwXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgYWxsR3JvdXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgZGVsZXRlIGFsbEdyb3Vwc1tpXS5jaGlsZHJlbk1hcDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdG9wTW9zdEdyb3VwLmNoaWxkcmVuO1xyXG59O1xyXG5cclxuR3JvdXBDcmVhdG9yLnByb3RvdHlwZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZXhwYW5kQnlEZWZhdWx0LCBsZXZlbCkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBhbmRCeURlZmF1bHQgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgcmV0dXJuIGxldmVsIDwgZXhwYW5kQnlEZWZhdWx0O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZXhwYW5kQnlEZWZhdWx0ID09PSB0cnVlIHx8IGV4cGFuZEJ5RGVmYXVsdCA9PT0gJ3RydWUnO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgR3JvdXBDcmVhdG9yKCk7XHJcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIFN2Z0ZhY3RvcnkgPSByZXF1aXJlKCcuL3N2Z0ZhY3RvcnknKTtcclxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XHJcblxyXG52YXIgc3ZnRmFjdG9yeSA9IG5ldyBTdmdGYWN0b3J5KCk7XHJcblxyXG5mdW5jdGlvbiBIZWFkZXJSZW5kZXJlcigpIHt9XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uQ29udHJvbGxlciwgY29sdW1uTW9kZWwsIGdyaWRQYW5lbCwgYW5ndWxhckdyaWQsIGZpbHRlck1hbmFnZXIsICRzY29wZSwgJGNvbXBpbGUsIGV4cHJlc3Npb25TZXJ2aWNlKSB7XHJcbiAgICB0aGlzLmV4cHJlc3Npb25TZXJ2aWNlID0gZXhwcmVzc2lvblNlcnZpY2U7XHJcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcclxuICAgIHRoaXMuY29sdW1uTW9kZWwgPSBjb2x1bW5Nb2RlbDtcclxuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlciA9IGNvbHVtbkNvbnRyb2xsZXI7XHJcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XHJcbiAgICB0aGlzLmZpbHRlck1hbmFnZXIgPSBmaWx0ZXJNYW5hZ2VyO1xyXG4gICAgdGhpcy4kc2NvcGUgPSAkc2NvcGU7XHJcbiAgICB0aGlzLiRjb21waWxlID0gJGNvbXBpbGU7XHJcbiAgICB0aGlzLmZpbmRBbGxFbGVtZW50cyhncmlkUGFuZWwpO1xyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmZpbmRBbGxFbGVtZW50cyA9IGZ1bmN0aW9uKGdyaWRQYW5lbCkge1xyXG4gICAgdGhpcy5lUGlubmVkSGVhZGVyID0gZ3JpZFBhbmVsLmdldFBpbm5lZEhlYWRlcigpO1xyXG4gICAgdGhpcy5lSGVhZGVyQ29udGFpbmVyID0gZ3JpZFBhbmVsLmdldEhlYWRlckNvbnRhaW5lcigpO1xyXG4gICAgdGhpcy5lSGVhZGVyID0gZ3JpZFBhbmVsLmdldEhlYWRlcigpO1xyXG4gICAgdGhpcy5lUm9vdCA9IGdyaWRQYW5lbC5nZXRSb290KCk7XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUucmVmcmVzaEhlYWRlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdXRpbHMucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lUGlubmVkSGVhZGVyKTtcclxuICAgIHV0aWxzLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZUhlYWRlckNvbnRhaW5lcik7XHJcblxyXG4gICAgaWYgKHRoaXMuY2hpbGRTY29wZXMpIHtcclxuICAgICAgICB0aGlzLmNoaWxkU2NvcGVzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRTY29wZSkge1xyXG4gICAgICAgICAgICBjaGlsZFNjb3BlLiRkZXN0cm95KCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmNoaWxkU2NvcGVzID0gW107XHJcblxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBIZWFkZXJzKCkpIHtcclxuICAgICAgICB0aGlzLmluc2VydEhlYWRlcnNXaXRoR3JvdXBpbmcoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pbnNlcnRIZWFkZXJzV2l0aG91dEdyb3VwaW5nKCk7XHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmluc2VydEhlYWRlcnNXaXRoR3JvdXBpbmcgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBncm91cHMgPSB0aGlzLmNvbHVtbk1vZGVsLmdldEhlYWRlckdyb3VwcygpO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcclxuICAgICAgICB2YXIgZUhlYWRlckNlbGwgPSB0aGF0LmNyZWF0ZUdyb3VwZWRIZWFkZXJDZWxsKGdyb3VwKTtcclxuICAgICAgICB2YXIgZUNvbnRhaW5lclRvQWRkVG8gPSBncm91cC5waW5uZWQgPyB0aGF0LmVQaW5uZWRIZWFkZXIgOiB0aGF0LmVIZWFkZXJDb250YWluZXI7XHJcbiAgICAgICAgZUNvbnRhaW5lclRvQWRkVG8uYXBwZW5kQ2hpbGQoZUhlYWRlckNlbGwpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlR3JvdXBlZEhlYWRlckNlbGwgPSBmdW5jdGlvbihncm91cCkge1xyXG5cclxuICAgIHZhciBlSGVhZGVyR3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGVIZWFkZXJHcm91cC5jbGFzc05hbWUgPSAnYWctaGVhZGVyLWdyb3VwJztcclxuXHJcbiAgICB2YXIgZUhlYWRlckdyb3VwQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZ3JvdXAuZUhlYWRlckdyb3VwQ2VsbCA9IGVIZWFkZXJHcm91cENlbGw7XHJcbiAgICB2YXIgY2xhc3NOYW1lcyA9IFsnYWctaGVhZGVyLWdyb3VwLWNlbGwnXTtcclxuICAgIC8vIGhhdmluZyBkaWZmZXJlbnQgY2xhc3NlcyBiZWxvdyBhbGxvd3MgdGhlIHN0eWxlIHRvIG5vdCBoYXZlIGEgYm90dG9tIGJvcmRlclxyXG4gICAgLy8gb24gdGhlIGdyb3VwIGhlYWRlciwgaWYgbm8gZ3JvdXAgaXMgc3BlY2lmaWVkXHJcbiAgICBpZiAoZ3JvdXAubmFtZSkge1xyXG4gICAgICAgIGNsYXNzTmFtZXMucHVzaCgnYWctaGVhZGVyLWdyb3VwLWNlbGwtd2l0aC1ncm91cCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjbGFzc05hbWVzLnB1c2goJ2FnLWhlYWRlci1ncm91cC1jZWxsLW5vLWdyb3VwJyk7XHJcbiAgICB9XHJcbiAgICBlSGVhZGVyR3JvdXBDZWxsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZXMuam9pbignICcpO1xyXG5cclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZUNvbFJlc2l6ZSgpKSB7XHJcbiAgICAgICAgdmFyIGVIZWFkZXJDZWxsUmVzaXplID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgICAgICBlSGVhZGVyQ2VsbFJlc2l6ZS5jbGFzc05hbWUgPSBcImFnLWhlYWRlci1jZWxsLXJlc2l6ZVwiO1xyXG4gICAgICAgIGVIZWFkZXJHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUhlYWRlckNlbGxSZXNpemUpO1xyXG4gICAgICAgIGdyb3VwLmVIZWFkZXJDZWxsUmVzaXplID0gZUhlYWRlckNlbGxSZXNpemU7XHJcbiAgICAgICAgdmFyIGRyYWdDYWxsYmFjayA9IHRoaXMuZ3JvdXBEcmFnQ2FsbGJhY2tGYWN0b3J5KGdyb3VwKTtcclxuICAgICAgICB0aGlzLmFkZERyYWdIYW5kbGVyKGVIZWFkZXJDZWxsUmVzaXplLCBkcmFnQ2FsbGJhY2spO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG5vIHJlbmRlcmVyLCBkZWZhdWx0IHRleHQgcmVuZGVyXHJcbiAgICB2YXIgZ3JvdXBOYW1lID0gZ3JvdXAubmFtZTtcclxuICAgIGlmIChncm91cE5hbWUgJiYgZ3JvdXBOYW1lICE9PSAnJykge1xyXG4gICAgICAgIHZhciBlR3JvdXBDZWxsTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIGVHcm91cENlbGxMYWJlbC5jbGFzc05hbWUgPSAnYWctaGVhZGVyLWdyb3VwLWNlbGwtbGFiZWwnO1xyXG4gICAgICAgIGVIZWFkZXJHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUdyb3VwQ2VsbExhYmVsKTtcclxuXHJcbiAgICAgICAgdmFyIGVJbm5lclRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICBlSW5uZXJUZXh0LmNsYXNzTmFtZSA9ICdhZy1oZWFkZXItZ3JvdXAtdGV4dCc7XHJcbiAgICAgICAgZUlubmVyVGV4dC5pbm5lckhUTUwgPSBncm91cE5hbWU7XHJcbiAgICAgICAgZUdyb3VwQ2VsbExhYmVsLmFwcGVuZENoaWxkKGVJbm5lclRleHQpO1xyXG5cclxuICAgICAgICBpZiAoZ3JvdXAuZXhwYW5kYWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZEdyb3VwRXhwYW5kSWNvbihncm91cCwgZUdyb3VwQ2VsbExhYmVsLCBncm91cC5leHBhbmRlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZUhlYWRlckdyb3VwLmFwcGVuZENoaWxkKGVIZWFkZXJHcm91cENlbGwpO1xyXG5cclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGdyb3VwLmRpc3BsYXllZENvbHVtbnMuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4pIHtcclxuICAgICAgICB2YXIgZUhlYWRlckNlbGwgPSB0aGF0LmNyZWF0ZUhlYWRlckNlbGwoY29sdW1uLCB0cnVlLCBncm91cCk7XHJcbiAgICAgICAgZUhlYWRlckdyb3VwLmFwcGVuZENoaWxkKGVIZWFkZXJDZWxsKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoYXQuc2V0V2lkdGhPZkdyb3VwSGVhZGVyQ2VsbChncm91cCk7XHJcblxyXG4gICAgcmV0dXJuIGVIZWFkZXJHcm91cDtcclxufTtcclxuXHJcbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRHcm91cEV4cGFuZEljb24gPSBmdW5jdGlvbihncm91cCwgZUhlYWRlckdyb3VwLCBleHBhbmRlZCkge1xyXG4gICAgdmFyIGVHcm91cEljb247XHJcbiAgICBpZiAoZXhwYW5kZWQpIHtcclxuICAgICAgICBlR3JvdXBJY29uID0gdXRpbHMuY3JlYXRlSWNvbignaGVhZGVyR3JvdXBPcGVuZWQnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd0xlZnRTdmcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBlR3JvdXBJY29uID0gdXRpbHMuY3JlYXRlSWNvbignaGVhZGVyR3JvdXBDbG9zZWQnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd1JpZ2h0U3ZnKTtcclxuICAgIH1cclxuICAgIGVHcm91cEljb24uY2xhc3NOYW1lID0gJ2FnLWhlYWRlci1leHBhbmQtaWNvbic7XHJcbiAgICBlSGVhZGVyR3JvdXAuYXBwZW5kQ2hpbGQoZUdyb3VwSWNvbik7XHJcblxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgZUdyb3VwSWNvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLmhlYWRlckdyb3VwT3BlbmVkKGdyb3VwKTtcclxuICAgIH07XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuYWRkRHJhZ0hhbmRsZXIgPSBmdW5jdGlvbihlRHJhZ2dhYmxlRWxlbWVudCwgZHJhZ0NhbGxiYWNrKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBlRHJhZ2dhYmxlRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihkb3duRXZlbnQpIHtcclxuICAgICAgICBkcmFnQ2FsbGJhY2sub25EcmFnU3RhcnQoKTtcclxuICAgICAgICB0aGF0LmVSb290LnN0eWxlLmN1cnNvciA9IFwiY29sLXJlc2l6ZVwiO1xyXG4gICAgICAgIHRoYXQuZHJhZ1N0YXJ0WCA9IGRvd25FdmVudC5jbGllbnRYO1xyXG5cclxuICAgICAgICB2YXIgbGlzdGVuZXJzVG9SZW1vdmUgPSB7fTtcclxuXHJcbiAgICAgICAgbGlzdGVuZXJzVG9SZW1vdmUubW91c2Vtb3ZlID0gZnVuY3Rpb24gKG1vdmVFdmVudCkge1xyXG4gICAgICAgICAgICB2YXIgbmV3WCA9IG1vdmVFdmVudC5jbGllbnRYO1xyXG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gbmV3WCAtIHRoYXQuZHJhZ1N0YXJ0WDtcclxuICAgICAgICAgICAgZHJhZ0NhbGxiYWNrLm9uRHJhZ2dpbmcoY2hhbmdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsaXN0ZW5lcnNUb1JlbW92ZS5tb3VzZXVwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGF0LnN0b3BEcmFnZ2luZyhsaXN0ZW5lcnNUb1JlbW92ZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGlzdGVuZXJzVG9SZW1vdmUubW91c2VsZWF2ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhhdC5zdG9wRHJhZ2dpbmcobGlzdGVuZXJzVG9SZW1vdmUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoYXQuZVJvb3QuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbGlzdGVuZXJzVG9SZW1vdmUubW91c2Vtb3ZlKTtcclxuICAgICAgICB0aGF0LmVSb290LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBsaXN0ZW5lcnNUb1JlbW92ZS5tb3VzZXVwKTtcclxuICAgICAgICB0aGF0LmVSb290LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBsaXN0ZW5lcnNUb1JlbW92ZS5tb3VzZWxlYXZlKTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLnNldFdpZHRoT2ZHcm91cEhlYWRlckNlbGwgPSBmdW5jdGlvbihoZWFkZXJHcm91cCkge1xyXG4gICAgdmFyIHRvdGFsV2lkdGggPSAwO1xyXG4gICAgaGVhZGVyR3JvdXAuZGlzcGxheWVkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgIHRvdGFsV2lkdGggKz0gY29sdW1uLmFjdHVhbFdpZHRoO1xyXG4gICAgfSk7XHJcbiAgICBoZWFkZXJHcm91cC5lSGVhZGVyR3JvdXBDZWxsLnN0eWxlLndpZHRoID0gdXRpbHMuZm9ybWF0V2lkdGgodG90YWxXaWR0aCk7XHJcbiAgICBoZWFkZXJHcm91cC5hY3R1YWxXaWR0aCA9IHRvdGFsV2lkdGg7XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuaW5zZXJ0SGVhZGVyc1dpdGhvdXRHcm91cGluZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGVQaW5uZWRIZWFkZXIgPSB0aGlzLmVQaW5uZWRIZWFkZXI7XHJcbiAgICB2YXIgZUhlYWRlckNvbnRhaW5lciA9IHRoaXMuZUhlYWRlckNvbnRhaW5lcjtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICB0aGlzLmNvbHVtbk1vZGVsLmdldERpc3BsYXllZENvbHVtbnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgIC8vIG9ubHkgaW5jbHVkZSB0aGUgZmlyc3QgeCBjb2xzXHJcbiAgICAgICAgdmFyIGhlYWRlckNlbGwgPSB0aGF0LmNyZWF0ZUhlYWRlckNlbGwoY29sdW1uLCBmYWxzZSk7XHJcbiAgICAgICAgaWYgKGNvbHVtbi5waW5uZWQpIHtcclxuICAgICAgICAgICAgZVBpbm5lZEhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJDZWxsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlSGVhZGVyQ29udGFpbmVyLmFwcGVuZENoaWxkKGhlYWRlckNlbGwpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUhlYWRlckNlbGwgPSBmdW5jdGlvbihjb2x1bW4sIGdyb3VwZWQsIGhlYWRlckdyb3VwKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuICAgIHZhciBlSGVhZGVyQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICAvLyBzdGljayB0aGUgaGVhZGVyIGNlbGwgaW4gY29sdW1uLCBhcyB3ZSBhY2Nlc3MgaXQgd2hlbiBncm91cCBpcyByZS1zaXplZFxyXG4gICAgY29sdW1uLmVIZWFkZXJDZWxsID0gZUhlYWRlckNlbGw7XHJcblxyXG4gICAgdmFyIG5ld0NoaWxkU2NvcGU7XHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZUhlYWRlcnMoKSkge1xyXG4gICAgICAgIG5ld0NoaWxkU2NvcGUgPSB0aGlzLiRzY29wZS4kbmV3KCk7XHJcbiAgICAgICAgbmV3Q2hpbGRTY29wZS5jb2xEZWYgPSBjb2xEZWY7XHJcbiAgICAgICAgbmV3Q2hpbGRTY29wZS5jb2xJbmRleCA9IGNvbERlZi5pbmRleDtcclxuICAgICAgICBuZXdDaGlsZFNjb3BlLmNvbERlZldyYXBwZXIgPSBjb2x1bW47XHJcbiAgICAgICAgdGhpcy5jaGlsZFNjb3Blcy5wdXNoKG5ld0NoaWxkU2NvcGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBoZWFkZXJDZWxsQ2xhc3NlcyA9IFsnYWctaGVhZGVyLWNlbGwnXTtcclxuICAgIGlmIChncm91cGVkKSB7XHJcbiAgICAgICAgaGVhZGVyQ2VsbENsYXNzZXMucHVzaCgnYWctaGVhZGVyLWNlbGwtZ3JvdXBlZCcpOyAvLyB0aGlzIHRha2VzIDUwJSBoZWlnaHRcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaGVhZGVyQ2VsbENsYXNzZXMucHVzaCgnYWctaGVhZGVyLWNlbGwtbm90LWdyb3VwZWQnKTsgLy8gdGhpcyB0YWtlcyAxMDAlIGhlaWdodFxyXG4gICAgfVxyXG4gICAgZUhlYWRlckNlbGwuY2xhc3NOYW1lID0gaGVhZGVyQ2VsbENsYXNzZXMuam9pbignICcpO1xyXG5cclxuICAgIHRoaXMuYWRkSGVhZGVyQ2xhc3Nlc0Zyb21Db2xsRGVmKGNvbERlZiwgbmV3Q2hpbGRTY29wZSwgZUhlYWRlckNlbGwpO1xyXG5cclxuICAgIC8vIGFkZCB0b29sdGlwIGlmIGV4aXN0c1xyXG4gICAgaWYgKGNvbERlZi5oZWFkZXJUb29sdGlwKSB7XHJcbiAgICAgICAgZUhlYWRlckNlbGwudGl0bGUgPSBjb2xEZWYuaGVhZGVyVG9vbHRpcDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVDb2xSZXNpemUoKSAmJiAhY29sRGVmLnN1cHByZXNzUmVzaXplKSB7XHJcbiAgICAgICAgdmFyIGhlYWRlckNlbGxSZXNpemUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIGhlYWRlckNlbGxSZXNpemUuY2xhc3NOYW1lID0gXCJhZy1oZWFkZXItY2VsbC1yZXNpemVcIjtcclxuICAgICAgICBlSGVhZGVyQ2VsbC5hcHBlbmRDaGlsZChoZWFkZXJDZWxsUmVzaXplKTtcclxuICAgICAgICB2YXIgZHJhZ0NhbGxiYWNrID0gdGhpcy5oZWFkZXJEcmFnQ2FsbGJhY2tGYWN0b3J5KGVIZWFkZXJDZWxsLCBjb2x1bW4sIGhlYWRlckdyb3VwKTtcclxuICAgICAgICB0aGlzLmFkZERyYWdIYW5kbGVyKGhlYWRlckNlbGxSZXNpemUsIGRyYWdDYWxsYmFjayk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmlsdGVyIGJ1dHRvblxyXG4gICAgdmFyIHNob3dNZW51ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVGaWx0ZXIoKSAmJiAhY29sRGVmLnN1cHByZXNzTWVudTtcclxuICAgIGlmIChzaG93TWVudSkge1xyXG4gICAgICAgIHZhciBlTWVudUJ1dHRvbiA9IHV0aWxzLmNyZWF0ZUljb24oJ21lbnUnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uLCBzdmdGYWN0b3J5LmNyZWF0ZU1lbnVTdmcpO1xyXG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGVNZW51QnV0dG9uLCAnYWctaGVhZGVyLWljb24nKTtcclxuXHJcbiAgICAgICAgZU1lbnVCdXR0b24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJhZy1oZWFkZXItY2VsbC1tZW51LWJ1dHRvblwiKTtcclxuICAgICAgICBlTWVudUJ1dHRvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQuZmlsdGVyTWFuYWdlci5zaG93RmlsdGVyKGNvbHVtbiwgdGhpcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBlSGVhZGVyQ2VsbC5hcHBlbmRDaGlsZChlTWVudUJ1dHRvbik7XHJcbiAgICAgICAgZUhlYWRlckNlbGwub25tb3VzZWVudGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGVNZW51QnV0dG9uLnN0eWxlLm9wYWNpdHkgPSAxO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgZUhlYWRlckNlbGwub25tb3VzZWxlYXZlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGVNZW51QnV0dG9uLnN0eWxlLm9wYWNpdHkgPSAwO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgZU1lbnVCdXR0b24uc3R5bGUub3BhY2l0eSA9IDA7XHJcbiAgICAgICAgZU1lbnVCdXR0b24uc3R5bGVbXCItd2Via2l0LXRyYW5zaXRpb25cIl0gPSBcIm9wYWNpdHkgMC41cywgYm9yZGVyIDAuMnNcIjtcclxuICAgICAgICBlTWVudUJ1dHRvbi5zdHlsZVtcInRyYW5zaXRpb25cIl0gPSBcIm9wYWNpdHkgMC41cywgYm9yZGVyIDAuMnNcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBsYWJlbCBkaXZcclxuICAgIHZhciBoZWFkZXJDZWxsTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgaGVhZGVyQ2VsbExhYmVsLmNsYXNzTmFtZSA9IFwiYWctaGVhZGVyLWNlbGwtbGFiZWxcIjtcclxuXHJcbiAgICAvLyBhZGQgaW4gc29ydCBpY29uc1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU29ydGluZygpICYmICFjb2xEZWYuc3VwcHJlc3NTb3J0aW5nKSB7XHJcbiAgICAgICAgY29sdW1uLmVTb3J0QXNjID0gdXRpbHMuY3JlYXRlSWNvbignc29ydEFzY2VuZGluZycsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW4sIHN2Z0ZhY3RvcnkuY3JlYXRlQXJyb3dEb3duU3ZnKTtcclxuICAgICAgICBjb2x1bW4uZVNvcnREZXNjID0gdXRpbHMuY3JlYXRlSWNvbignc29ydERlc2NlbmRpbmcnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uLCBzdmdGYWN0b3J5LmNyZWF0ZUFycm93VXBTdmcpO1xyXG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGNvbHVtbi5lU29ydEFzYywgJ2FnLWhlYWRlci1pY29uJyk7XHJcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoY29sdW1uLmVTb3J0RGVzYywgJ2FnLWhlYWRlci1pY29uJyk7XHJcbiAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNvbHVtbi5lU29ydEFzYyk7XHJcbiAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNvbHVtbi5lU29ydERlc2MpO1xyXG4gICAgICAgIGNvbHVtbi5lU29ydEFzYy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIGNvbHVtbi5lU29ydERlc2Muc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLmFkZFNvcnRIYW5kbGluZyhoZWFkZXJDZWxsTGFiZWwsIGNvbHVtbik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRkIGluIGZpbHRlciBpY29uXHJcbiAgICBjb2x1bW4uZUZpbHRlckljb24gPSB1dGlscy5jcmVhdGVJY29uKCdmaWx0ZXInLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uLCBzdmdGYWN0b3J5LmNyZWF0ZUZpbHRlclN2Zyk7XHJcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhjb2x1bW4uZUZpbHRlckljb24sICdhZy1oZWFkZXItaWNvbicpO1xyXG4gICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNvbHVtbi5lRmlsdGVySWNvbik7XHJcblxyXG4gICAgLy8gcmVuZGVyIHRoZSBjZWxsLCB1c2UgYSByZW5kZXJlciBpZiBvbmUgaXMgcHJvdmlkZWRcclxuICAgIHZhciBoZWFkZXJDZWxsUmVuZGVyZXI7XHJcbiAgICBpZiAoY29sRGVmLmhlYWRlckNlbGxSZW5kZXJlcikgeyAvLyBmaXJzdCBsb29rIGZvciBhIHJlbmRlcmVyIGluIGNvbCBkZWZcclxuICAgICAgICBoZWFkZXJDZWxsUmVuZGVyZXIgPSBjb2xEZWYuaGVhZGVyQ2VsbFJlbmRlcmVyO1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRIZWFkZXJDZWxsUmVuZGVyZXIoKSkgeyAvLyBzZWNvbmQgbG9vayBmb3Igb25lIGluIGdyaWQgb3B0aW9uc1xyXG4gICAgICAgIGhlYWRlckNlbGxSZW5kZXJlciA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEhlYWRlckNlbGxSZW5kZXJlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBoZWFkZXJOYW1lVmFsdWUgPSB0aGlzLmNvbHVtbk1vZGVsLmdldERpc3BsYXlOYW1lRm9yQ29sKGNvbHVtbik7XHJcblxyXG4gICAgaWYgKGhlYWRlckNlbGxSZW5kZXJlcikge1xyXG4gICAgICAgIC8vIHJlbmRlcmVyIHByb3ZpZGVkLCB1c2UgaXRcclxuICAgICAgICB2YXIgY2VsbFJlbmRlcmVyUGFyYW1zID0ge1xyXG4gICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcclxuICAgICAgICAgICAgJHNjb3BlOiBuZXdDaGlsZFNjb3BlLFxyXG4gICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXHJcbiAgICAgICAgICAgIHZhbHVlOiBoZWFkZXJOYW1lVmFsdWUsXHJcbiAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcclxuICAgICAgICB9O1xyXG4gICAgICAgIHZhciBjZWxsUmVuZGVyZXJSZXN1bHQgPSBoZWFkZXJDZWxsUmVuZGVyZXIoY2VsbFJlbmRlcmVyUGFyYW1zKTtcclxuICAgICAgICB2YXIgY2hpbGRUb0FwcGVuZDtcclxuICAgICAgICBpZiAodXRpbHMuaXNOb2RlT3JFbGVtZW50KGNlbGxSZW5kZXJlclJlc3VsdCkpIHtcclxuICAgICAgICAgICAgLy8gYSBkb20gbm9kZSBvciBlbGVtZW50IHdhcyByZXR1cm5lZCwgc28gYWRkIGNoaWxkXHJcbiAgICAgICAgICAgIGNoaWxkVG9BcHBlbmQgPSBjZWxsUmVuZGVyZXJSZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGFzc3VtZSBpdCB3YXMgaHRtbCwgc28ganVzdCBpbnNlcnRcclxuICAgICAgICAgICAgdmFyIGVUZXh0U3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgICAgICAgICBlVGV4dFNwYW4uaW5uZXJIVE1MID0gY2VsbFJlbmRlcmVyUmVzdWx0O1xyXG4gICAgICAgICAgICBjaGlsZFRvQXBwZW5kID0gZVRleHRTcGFuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhbmd1bGFyIGNvbXBpbGUgaGVhZGVyIGlmIG9wdGlvbiBpcyB0dXJuZWQgb25cclxuICAgICAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZUhlYWRlcnMoKSkge1xyXG4gICAgICAgICAgICB2YXIgY2hpbGRUb0FwcGVuZENvbXBpbGVkID0gdGhpcy4kY29tcGlsZShjaGlsZFRvQXBwZW5kKShuZXdDaGlsZFNjb3BlKVswXTtcclxuICAgICAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNoaWxkVG9BcHBlbmRDb21waWxlZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNoaWxkVG9BcHBlbmQpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gbm8gcmVuZGVyZXIsIGRlZmF1bHQgdGV4dCByZW5kZXJcclxuICAgICAgICB2YXIgZUlubmVyVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgICAgIGVJbm5lclRleHQuY2xhc3NOYW1lID0gJ2FnLWhlYWRlci1jZWxsLXRleHQnO1xyXG4gICAgICAgIGVJbm5lclRleHQuaW5uZXJIVE1MID0gaGVhZGVyTmFtZVZhbHVlO1xyXG4gICAgICAgIGhlYWRlckNlbGxMYWJlbC5hcHBlbmRDaGlsZChlSW5uZXJUZXh0KTtcclxuICAgIH1cclxuXHJcbiAgICBlSGVhZGVyQ2VsbC5hcHBlbmRDaGlsZChoZWFkZXJDZWxsTGFiZWwpO1xyXG4gICAgZUhlYWRlckNlbGwuc3R5bGUud2lkdGggPSB1dGlscy5mb3JtYXRXaWR0aChjb2x1bW4uYWN0dWFsV2lkdGgpO1xyXG5cclxuICAgIHJldHVybiBlSGVhZGVyQ2VsbDtcclxufTtcclxuXHJcbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRIZWFkZXJDbGFzc2VzRnJvbUNvbGxEZWYgPSBmdW5jdGlvbihjb2xEZWYsICRjaGlsZFNjb3BlLCBlSGVhZGVyQ2VsbCkge1xyXG4gICAgaWYgKGNvbERlZi5oZWFkZXJDbGFzcykge1xyXG4gICAgICAgIHZhciBjbGFzc1RvVXNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29sRGVmLmhlYWRlckNsYXNzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcclxuICAgICAgICAgICAgICAgICRzY29wZTogJGNoaWxkU2NvcGUsXHJcbiAgICAgICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXHJcbiAgICAgICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNsYXNzVG9Vc2UgPSBjb2xEZWYuaGVhZGVyQ2xhc3MocGFyYW1zKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGFzc1RvVXNlID0gY29sRGVmLmhlYWRlckNsYXNzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBjbGFzc1RvVXNlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlSGVhZGVyQ2VsbCwgY2xhc3NUb1VzZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGNsYXNzVG9Vc2UpKSB7XHJcbiAgICAgICAgICAgIGNsYXNzVG9Vc2UuZm9yRWFjaChmdW5jdGlvbihjc3NDbGFzc0l0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGVIZWFkZXJDZWxsLCBjc3NDbGFzc0l0ZW0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuZ2V0TmV4dFNvcnREaXJlY3Rpb24gPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgIHZhciBzdXBwcmVzc1VuU29ydCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzU3VwcHJlc3NVblNvcnQoKTtcclxuICAgIHZhciBzdXBwcmVzc0Rlc2NTb3J0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc0Rlc2NTb3J0KCk7XHJcblxyXG4gICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5ERVNDOlxyXG4gICAgICAgICAgICBpZiAoc3VwcHJlc3NVblNvcnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb25zdGFudHMuQVNDO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5BU0M6XHJcbiAgICAgICAgICAgIGlmIChzdXBwcmVzc1VuU29ydCAmJiBzdXBwcmVzc0Rlc2NTb3J0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uc3RhbnRzLkFTQztcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdXBwcmVzc0Rlc2NTb3J0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb25zdGFudHMuREVTQztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIGRlZmF1bHQgOlxyXG4gICAgICAgICAgICByZXR1cm4gY29uc3RhbnRzLkFTQztcclxuICAgIH1cclxufTtcclxuXHJcbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRTb3J0SGFuZGxpbmcgPSBmdW5jdGlvbihoZWFkZXJDZWxsTGFiZWwsIGNvbHVtbikge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGhlYWRlckNlbGxMYWJlbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xyXG5cclxuICAgICAgICAvLyB1cGRhdGUgc29ydCBvbiBjdXJyZW50IGNvbFxyXG4gICAgICAgIGNvbHVtbi5zb3J0ID0gdGhhdC5nZXROZXh0U29ydERpcmVjdGlvbihjb2x1bW4uc29ydCk7XHJcblxyXG4gICAgICAgIC8vIHNvcnRlZEF0IHVzZWQgZm9yIGtub3dpbmcgb3JkZXIgb2YgY29scyB3aGVuIG11bHRpLWNvbCBzb3J0XHJcbiAgICAgICAgaWYgKGNvbHVtbi5zb3J0KSB7XHJcbiAgICAgICAgICAgIGNvbHVtbi5zb3J0ZWRBdCA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbHVtbi5zb3J0ZWRBdCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZG9pbmdNdWx0aVNvcnQgPSAhdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc011bHRpU29ydCgpICYmIGUuc2hpZnRLZXk7XHJcblxyXG4gICAgICAgIC8vIGNsZWFyIHNvcnQgb24gYWxsIGNvbHVtbnMgZXhjZXB0IHRoaXMgb25lLCBhbmQgdXBkYXRlIHRoZSBpY29uc1xyXG4gICAgICAgIHRoYXQuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sdW1uVG9DbGVhcikge1xyXG4gICAgICAgICAgICAvLyBEbyBub3QgY2xlYXIgaWYgZWl0aGVyIGhvbGRpbmcgc2hpZnQsIG9yIGlmIGNvbHVtbiBpbiBxdWVzdGlvbiB3YXMgY2xpY2tlZFxyXG4gICAgICAgICAgICBpZiAoIShkb2luZ011bHRpU29ydCB8fCBjb2x1bW5Ub0NsZWFyID09PSBjb2x1bW4pKSB7XHJcbiAgICAgICAgICAgICAgICBjb2x1bW5Ub0NsZWFyLnNvcnQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoYXQuYW5ndWxhckdyaWQub25Tb3J0aW5nQ2hhbmdlZCgpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlU29ydEljb25zID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmNvbHVtbk1vZGVsLmdldEFsbENvbHVtbnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgIC8vIHVwZGF0ZSB2aXNpYmlsaXR5IG9mIGljb25zXHJcbiAgICAgICAgdmFyIHNvcnRBc2NlbmRpbmcgPSBjb2x1bW4uc29ydCA9PT0gY29uc3RhbnRzLkFTQztcclxuICAgICAgICB2YXIgc29ydERlc2NlbmRpbmcgPSBjb2x1bW4uc29ydCA9PT0gY29uc3RhbnRzLkRFU0M7XHJcblxyXG4gICAgICAgIGlmIChjb2x1bW4uZVNvcnRBc2MpIHtcclxuICAgICAgICAgICAgdXRpbHMuc2V0VmlzaWJsZShjb2x1bW4uZVNvcnRBc2MsIHNvcnRBc2NlbmRpbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29sdW1uLmVTb3J0RGVzYykge1xyXG4gICAgICAgICAgICB1dGlscy5zZXRWaXNpYmxlKGNvbHVtbi5lU29ydERlc2MsIHNvcnREZXNjZW5kaW5nKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5ncm91cERyYWdDYWxsYmFja0ZhY3RvcnkgPSBmdW5jdGlvbihjdXJyZW50R3JvdXApIHtcclxuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xyXG4gICAgdmFyIGRpc3BsYXllZENvbHVtbnMgPSBjdXJyZW50R3JvdXAuZGlzcGxheWVkQ29sdW1ucztcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgb25EcmFnU3RhcnQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmdyb3VwV2lkdGhTdGFydCA9IGN1cnJlbnRHcm91cC5hY3R1YWxXaWR0aDtcclxuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbldpZHRoU3RhcnRzID0gW107XHJcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgZGlzcGxheWVkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbERlZldyYXBwZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuY2hpbGRyZW5XaWR0aFN0YXJ0cy5wdXNoKGNvbERlZldyYXBwZXIuYWN0dWFsV2lkdGgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5taW5XaWR0aCA9IGRpc3BsYXllZENvbHVtbnMubGVuZ3RoICogY29uc3RhbnRzLk1JTl9DT0xfV0lEVEg7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkRyYWdnaW5nOiBmdW5jdGlvbihkcmFnQ2hhbmdlKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgbmV3V2lkdGggPSB0aGlzLmdyb3VwV2lkdGhTdGFydCArIGRyYWdDaGFuZ2U7XHJcbiAgICAgICAgICAgIGlmIChuZXdXaWR0aCA8IHRoaXMubWluV2lkdGgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gdGhpcy5taW5XaWR0aDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gc2V0IHRoZSBuZXcgd2lkdGggdG8gdGhlIGdyb3VwIGhlYWRlclxyXG4gICAgICAgICAgICB2YXIgbmV3V2lkdGhQeCA9IG5ld1dpZHRoICsgXCJweFwiO1xyXG4gICAgICAgICAgICBjdXJyZW50R3JvdXAuZUhlYWRlckdyb3VwQ2VsbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoUHg7XHJcbiAgICAgICAgICAgIGN1cnJlbnRHcm91cC5hY3R1YWxXaWR0aCA9IG5ld1dpZHRoO1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzdHJpYnV0ZSB0aGUgbmV3IHdpZHRoIHRvIHRoZSBjaGlsZCBoZWFkZXJzXHJcbiAgICAgICAgICAgIHZhciBjaGFuZ2VSYXRpbyA9IG5ld1dpZHRoIC8gdGhpcy5ncm91cFdpZHRoU3RhcnQ7XHJcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgcGl4ZWxzIHVzZWQsIGFuZCBsYXN0IGNvbHVtbiBnZXRzIHRoZSByZW1haW5pbmcsXHJcbiAgICAgICAgICAgIC8vIHRvIGNhdGVyIGZvciByb3VuZGluZyBlcnJvcnMsIGFuZCBtaW4gd2lkdGggYWRqdXN0bWVudHNcclxuICAgICAgICAgICAgdmFyIHBpeGVsc1RvRGlzdHJpYnV0ZSA9IG5ld1dpZHRoO1xyXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgICAgIGN1cnJlbnRHcm91cC5kaXNwbGF5ZWRDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sRGVmV3JhcHBlciwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBub3RMYXN0Q29sID0gaW5kZXggIT09IChkaXNwbGF5ZWRDb2x1bW5zLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkU2l6ZTtcclxuICAgICAgICAgICAgICAgIGlmIChub3RMYXN0Q29sKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgbm90IHRoZSBsYXN0IGNvbCwgY2FsY3VsYXRlIHRoZSBjb2x1bW4gd2lkdGggYXMgbm9ybWFsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0Q2hpbGRTaXplID0gdGhhdC5jaGlsZHJlbldpZHRoU3RhcnRzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZFNpemUgPSBzdGFydENoaWxkU2l6ZSAqIGNoYW5nZVJhdGlvO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdDaGlsZFNpemUgPCBjb25zdGFudHMuTUlOX0NPTF9XSURUSCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZFNpemUgPSBjb25zdGFudHMuTUlOX0NPTF9XSURUSDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcGl4ZWxzVG9EaXN0cmlidXRlIC09IG5ld0NoaWxkU2l6ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgbGFzdCBjb2wsIGdpdmUgaXQgdGhlIHJlbWFpbmluZyBwaXhlbHNcclxuICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZFNpemUgPSBwaXhlbHNUb0Rpc3RyaWJ1dGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgZUhlYWRlckNlbGwgPSBkaXNwbGF5ZWRDb2x1bW5zW2luZGV4XS5lSGVhZGVyQ2VsbDtcclxuICAgICAgICAgICAgICAgIHBhcmVudC5hZGp1c3RDb2x1bW5XaWR0aChuZXdDaGlsZFNpemUsIGNvbERlZldyYXBwZXIsIGVIZWFkZXJDZWxsKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBzaG91bGQgbm90IGJlIGNhbGxpbmcgdGhlc2UgaGVyZSwgc2hvdWxkIGRvIHNvbWV0aGluZyBlbHNlXHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50R3JvdXAucGlubmVkKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQuYW5ndWxhckdyaWQudXBkYXRlUGlubmVkQ29sQ29udGFpbmVyV2lkdGhBZnRlckNvbFJlc2l6ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50LmFuZ3VsYXJHcmlkLnVwZGF0ZUJvZHlDb250YWluZXJXaWR0aEFmdGVyQ29sUmVzaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmFkanVzdENvbHVtbldpZHRoID0gZnVuY3Rpb24obmV3V2lkdGgsIGNvbHVtbiwgZUhlYWRlckNlbGwpIHtcclxuICAgIHZhciBuZXdXaWR0aFB4ID0gbmV3V2lkdGggKyBcInB4XCI7XHJcbiAgICB2YXIgc2VsZWN0b3JGb3JBbGxDb2xzSW5DZWxsID0gXCIuY2VsbC1jb2wtXCIgKyBjb2x1bW4uaW5kZXg7XHJcbiAgICB2YXIgY2VsbHNGb3JUaGlzQ29sID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yRm9yQWxsQ29sc0luQ2VsbCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNlbGxzRm9yVGhpc0NvbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGNlbGxzRm9yVGhpc0NvbFtpXS5zdHlsZS53aWR0aCA9IG5ld1dpZHRoUHg7XHJcbiAgICB9XHJcblxyXG4gICAgZUhlYWRlckNlbGwuc3R5bGUud2lkdGggPSBuZXdXaWR0aFB4O1xyXG4gICAgY29sdW1uLmFjdHVhbFdpZHRoID0gbmV3V2lkdGg7XHJcbn07XHJcblxyXG4vLyBnZXRzIGNhbGxlZCB3aGVuIGEgaGVhZGVyIChub3QgYSBoZWFkZXIgZ3JvdXApIGdldHMgcmVzaXplZFxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuaGVhZGVyRHJhZ0NhbGxiYWNrRmFjdG9yeSA9IGZ1bmN0aW9uKGhlYWRlckNlbGwsIGNvbHVtbiwgaGVhZGVyR3JvdXApIHtcclxuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBvbkRyYWdTdGFydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnRXaWR0aCA9IGNvbHVtbi5hY3R1YWxXaWR0aDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRHJhZ2dpbmc6IGZ1bmN0aW9uKGRyYWdDaGFuZ2UpIHtcclxuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gdGhpcy5zdGFydFdpZHRoICsgZHJhZ0NoYW5nZTtcclxuICAgICAgICAgICAgaWYgKG5ld1dpZHRoIDwgY29uc3RhbnRzLk1JTl9DT0xfV0lEVEgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gY29uc3RhbnRzLk1JTl9DT0xfV0lEVEg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHBhcmVudC5hZGp1c3RDb2x1bW5XaWR0aChuZXdXaWR0aCwgY29sdW1uLCBoZWFkZXJDZWxsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChoZWFkZXJHcm91cCkge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50LnNldFdpZHRoT2ZHcm91cEhlYWRlckNlbGwoaGVhZGVyR3JvdXApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzaG91bGQgbm90IGJlIGNhbGxpbmcgdGhlc2UgaGVyZSwgc2hvdWxkIGRvIHNvbWV0aGluZyBlbHNlXHJcbiAgICAgICAgICAgIGlmIChjb2x1bW4ucGlubmVkKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQuYW5ndWxhckdyaWQudXBkYXRlUGlubmVkQ29sQ29udGFpbmVyV2lkdGhBZnRlckNvbFJlc2l6ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50LmFuZ3VsYXJHcmlkLnVwZGF0ZUJvZHlDb250YWluZXJXaWR0aEFmdGVyQ29sUmVzaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59O1xyXG5cclxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLnN0b3BEcmFnZ2luZyA9IGZ1bmN0aW9uKGxpc3RlbmVyc1RvUmVtb3ZlKSB7XHJcbiAgICB0aGlzLmVSb290LnN0eWxlLmN1cnNvciA9IFwiXCI7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB1dGlscy5pdGVyYXRlT2JqZWN0KGxpc3RlbmVyc1RvUmVtb3ZlLCBmdW5jdGlvbihrZXksIGxpc3RlbmVyKSB7XHJcbiAgICAgICAgdGhhdC5lUm9vdC5yZW1vdmVFdmVudExpc3RlbmVyKGtleSwgbGlzdGVuZXIpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlRmlsdGVySWNvbnMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XHJcbiAgICAgICAgLy8gdG9kbzogbmVlZCB0byBjaGFuZ2UgdGhpcywgc28gb25seSB1cGRhdGVzIGlmIGNvbHVtbiBpcyB2aXNpYmxlXHJcbiAgICAgICAgaWYgKGNvbHVtbi5lRmlsdGVySWNvbikge1xyXG4gICAgICAgICAgICB2YXIgZmlsdGVyUHJlc2VudCA9IHRoYXQuZmlsdGVyTWFuYWdlci5pc0ZpbHRlclByZXNlbnRGb3JDb2woY29sdW1uLmNvbElkKTtcclxuICAgICAgICAgICAgdmFyIGRpc3BsYXlTdHlsZSA9IGZpbHRlclByZXNlbnQgPyAnaW5saW5lJyA6ICdub25lJztcclxuICAgICAgICAgICAgY29sdW1uLmVGaWx0ZXJJY29uLnN0eWxlLmRpc3BsYXkgPSBkaXNwbGF5U3R5bGU7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclJlbmRlcmVyO1xyXG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gQm9yZGVyTGF5b3V0KHBhcmFtcykge1xyXG5cclxuICAgIHRoaXMuaXNMYXlvdXRQYW5lbCA9IHRydWU7XHJcblxyXG4gICAgdGhpcy5mdWxsSGVpZ2h0ID0gIXBhcmFtcy5ub3J0aCAmJiAhcGFyYW1zLnNvdXRoO1xyXG5cclxuICAgIHZhciB0ZW1wbGF0ZTtcclxuICAgIGlmICghcGFyYW1zLmRvbnRGaWxsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZnVsbEhlaWdodCkge1xyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9XHJcbiAgICAgICAgICAgICAgICAnPGRpdiBzdHlsZT1cImhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGF1dG87IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj4nICtcclxuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwid2VzdFwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBmbG9hdDogbGVmdDtcIj48L2Rpdj4nICtcclxuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiZWFzdFwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBmbG9hdDogcmlnaHQ7XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImNlbnRlclwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlO1wiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJvdmVybGF5XCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAnPC9kaXY+JztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9XHJcbiAgICAgICAgICAgICAgICAnPGRpdiBzdHlsZT1cImhlaWdodDogMTAwJTsgcG9zaXRpb246IHJlbGF0aXZlO1wiPicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJub3J0aFwiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJjZW50ZXJSb3dcIiBzdHlsZT1cImhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjtcIj4nICtcclxuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwid2VzdFwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBmbG9hdDogbGVmdDtcIj48L2Rpdj4nICtcclxuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiZWFzdFwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBmbG9hdDogcmlnaHQ7XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImNlbnRlclwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlO1wiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJzb3V0aFwiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJvdmVybGF5XCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICAgICAnPC9kaXY+JztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5sYXlvdXRBY3RpdmUgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0ZW1wbGF0ZSA9XHJcbiAgICAgICAgICAgICc8ZGl2IHN0eWxlPVwicG9zaXRpb246IHJlbGF0aXZlO1wiPicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJub3J0aFwiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJjZW50ZXJSb3dcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cIndlc3RcIj48L2Rpdj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImVhc3RcIj48L2Rpdj4nICtcclxuICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImNlbnRlclwiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJzb3V0aFwiPjwvZGl2PicgK1xyXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJvdmVybGF5XCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7XCI+PC9kaXY+JyArXHJcbiAgICAgICAgICAgICc8L2Rpdj4nO1xyXG4gICAgICAgIHRoaXMubGF5b3V0QWN0aXZlID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5lR3VpID0gdXRpbHMubG9hZFRlbXBsYXRlKHRlbXBsYXRlKTtcclxuXHJcbiAgICB0aGlzLmlkID0gJ2JvcmRlckxheW91dCc7XHJcbiAgICBpZiAocGFyYW1zLm5hbWUpIHtcclxuICAgICAgICB0aGlzLmlkICs9ICdfJyArIHBhcmFtcy5uYW1lO1xyXG4gICAgfVxyXG4gICAgdGhpcy5lR3VpLnNldEF0dHJpYnV0ZSgnaWQnLCB0aGlzLmlkKTtcclxuICAgIHRoaXMuY2hpbGRQYW5lbHMgPSBbXTtcclxuXHJcbiAgICBpZiAocGFyYW1zKSB7XHJcbiAgICAgICAgdGhpcy5zZXR1cFBhbmVscyhwYXJhbXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc2V0T3ZlcmxheVZpc2libGUoZmFsc2UpO1xyXG59XHJcblxyXG5Cb3JkZXJMYXlvdXQucHJvdG90eXBlLnNldHVwUGFuZWxzID0gZnVuY3Rpb24ocGFyYW1zKSB7XHJcbiAgICB0aGlzLmVOb3J0aFdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI25vcnRoJyk7XHJcbiAgICB0aGlzLmVTb3V0aFdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI3NvdXRoJyk7XHJcbiAgICB0aGlzLmVFYXN0V3JhcHBlciA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjZWFzdCcpO1xyXG4gICAgdGhpcy5lV2VzdFdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI3dlc3QnKTtcclxuICAgIHRoaXMuZUNlbnRlcldyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2NlbnRlcicpO1xyXG4gICAgdGhpcy5lT3ZlcmxheVdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI292ZXJsYXknKTtcclxuICAgIHRoaXMuZUNlbnRlclJvdyA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjY2VudGVyUm93Jyk7XHJcblxyXG4gICAgdGhpcy5lTm9ydGhDaGlsZExheW91dCA9IHRoaXMuc2V0dXBQYW5lbChwYXJhbXMubm9ydGgsIHRoaXMuZU5vcnRoV3JhcHBlcik7XHJcbiAgICB0aGlzLmVTb3V0aENoaWxkTGF5b3V0ID0gdGhpcy5zZXR1cFBhbmVsKHBhcmFtcy5zb3V0aCwgdGhpcy5lU291dGhXcmFwcGVyKTtcclxuICAgIHRoaXMuZUVhc3RDaGlsZExheW91dCA9IHRoaXMuc2V0dXBQYW5lbChwYXJhbXMuZWFzdCwgdGhpcy5lRWFzdFdyYXBwZXIpO1xyXG4gICAgdGhpcy5lV2VzdENoaWxkTGF5b3V0ID0gdGhpcy5zZXR1cFBhbmVsKHBhcmFtcy53ZXN0LCB0aGlzLmVXZXN0V3JhcHBlcik7XHJcbiAgICB0aGlzLmVDZW50ZXJDaGlsZExheW91dCA9IHRoaXMuc2V0dXBQYW5lbChwYXJhbXMuY2VudGVyLCB0aGlzLmVDZW50ZXJXcmFwcGVyKTtcclxuXHJcbiAgICB0aGlzLnNldHVwUGFuZWwocGFyYW1zLm92ZXJsYXksIHRoaXMuZU92ZXJsYXlXcmFwcGVyKTtcclxufTtcclxuXHJcbkJvcmRlckxheW91dC5wcm90b3R5cGUuc2V0dXBQYW5lbCA9IGZ1bmN0aW9uKGNvbnRlbnQsIGVQYW5lbCkge1xyXG4gICAgaWYgKCFlUGFuZWwpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoY29udGVudCkge1xyXG4gICAgICAgIGlmIChjb250ZW50LmlzTGF5b3V0UGFuZWwpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGlsZFBhbmVscy5wdXNoKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICBlUGFuZWwuYXBwZW5kQ2hpbGQoY29udGVudC5nZXRHdWkoKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVQYW5lbC5hcHBlbmRDaGlsZChjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBlUGFuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlUGFuZWwpO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5nZXRHdWkgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmVHdWk7XHJcbn07XHJcblxyXG5Cb3JkZXJMYXlvdXQucHJvdG90eXBlLmRvTGF5b3V0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdGhpcy5sYXlvdXRDaGlsZCh0aGlzLmVOb3J0aENoaWxkTGF5b3V0KTtcclxuICAgIHRoaXMubGF5b3V0Q2hpbGQodGhpcy5lU291dGhDaGlsZExheW91dCk7XHJcbiAgICB0aGlzLmxheW91dENoaWxkKHRoaXMuZUVhc3RDaGlsZExheW91dCk7XHJcbiAgICB0aGlzLmxheW91dENoaWxkKHRoaXMuZVdlc3RDaGlsZExheW91dCk7XHJcblxyXG4gICAgaWYgKHRoaXMubGF5b3V0QWN0aXZlKSB7XHJcbiAgICAgICAgdGhpcy5sYXlvdXRIZWlnaHQoKTtcclxuICAgICAgICB0aGlzLmxheW91dFdpZHRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sYXlvdXRDaGlsZCh0aGlzLmVDZW50ZXJDaGlsZExheW91dCk7XHJcbn07XHJcblxyXG5Cb3JkZXJMYXlvdXQucHJvdG90eXBlLmxheW91dENoaWxkID0gZnVuY3Rpb24oY2hpbGRQYW5lbCkge1xyXG4gICAgaWYgKGNoaWxkUGFuZWwpIHtcclxuICAgICAgICBjaGlsZFBhbmVsLmRvTGF5b3V0KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Cb3JkZXJMYXlvdXQucHJvdG90eXBlLmxheW91dEhlaWdodCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMuZnVsbEhlaWdodCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdG90YWxIZWlnaHQgPSB1dGlscy5vZmZzZXRIZWlnaHQodGhpcy5lR3VpKTtcclxuICAgIHZhciBub3J0aEhlaWdodCA9IHV0aWxzLm9mZnNldEhlaWdodCh0aGlzLmVOb3J0aFdyYXBwZXIpO1xyXG4gICAgdmFyIHNvdXRoSGVpZ2h0ID0gdXRpbHMub2Zmc2V0SGVpZ2h0KHRoaXMuZVNvdXRoV3JhcHBlcik7XHJcblxyXG4gICAgdmFyIGNlbnRlckhlaWdodCA9IHRvdGFsSGVpZ2h0IC0gbm9ydGhIZWlnaHQgLSBzb3V0aEhlaWdodDtcclxuICAgIGlmIChjZW50ZXJIZWlnaHQgPCAwKSB7XHJcbiAgICAgICAgY2VudGVySGVpZ2h0ID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmVDZW50ZXJSb3cuc3R5bGUuaGVpZ2h0ID0gY2VudGVySGVpZ2h0ICsgJ3B4JztcclxufTtcclxuXHJcbkJvcmRlckxheW91dC5wcm90b3R5cGUubGF5b3V0V2lkdGggPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0b3RhbFdpZHRoID0gdXRpbHMub2Zmc2V0V2lkdGgodGhpcy5lR3VpKTtcclxuICAgIHZhciBlYXN0V2lkdGggPSB1dGlscy5vZmZzZXRXaWR0aCh0aGlzLmVFYXN0V3JhcHBlcik7XHJcbiAgICB2YXIgd2VzdFdpZHRoID0gdXRpbHMub2Zmc2V0V2lkdGgodGhpcy5lV2VzdFdyYXBwZXIpO1xyXG5cclxuICAgIHZhciBjZW50ZXJXaWR0aCA9IHRvdGFsV2lkdGggLSBlYXN0V2lkdGggLSB3ZXN0V2lkdGg7XHJcbiAgICBpZiAoY2VudGVyV2lkdGggPCAwKSB7XHJcbiAgICAgICAgY2VudGVyV2lkdGggPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZUNlbnRlcldyYXBwZXIuc3R5bGUud2lkdGggPSBjZW50ZXJXaWR0aCArICdweCc7XHJcbn07XHJcblxyXG5Cb3JkZXJMYXlvdXQucHJvdG90eXBlLnNldEVhc3RWaXNpYmxlID0gZnVuY3Rpb24odmlzaWJsZSkge1xyXG4gICAgaWYgKHRoaXMuZUVhc3RXcmFwcGVyKSB7XHJcbiAgICAgICAgdGhpcy5lRWFzdFdyYXBwZXIuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyAnJyA6ICdub25lJztcclxuICAgIH1cclxuICAgIHRoaXMuZG9MYXlvdXQoKTtcclxufTtcclxuXHJcbkJvcmRlckxheW91dC5wcm90b3R5cGUuc2V0T3ZlcmxheVZpc2libGUgPSBmdW5jdGlvbih2aXNpYmxlKSB7XHJcbiAgICBpZiAodGhpcy5lT3ZlcmxheVdyYXBwZXIpIHtcclxuICAgICAgICB0aGlzLmVPdmVybGF5V3JhcHBlci5zdHlsZS5kaXNwbGF5ID0gdmlzaWJsZSA/ICcnIDogJ25vbmUnO1xyXG4gICAgfVxyXG4gICAgdGhpcy5kb0xheW91dCgpO1xyXG59O1xyXG5cclxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5zZXRTb3V0aFZpc2libGUgPSBmdW5jdGlvbih2aXNpYmxlKSB7XHJcbiAgICBpZiAodGhpcy5lU291dGhXcmFwcGVyKSB7XHJcbiAgICAgICAgdGhpcy5lU291dGhXcmFwcGVyLnN0eWxlLmRpc3BsYXkgPSB2aXNpYmxlID8gJycgOiAnbm9uZSc7XHJcbiAgICB9XHJcbiAgICB0aGlzLmRvTGF5b3V0KCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJvcmRlckxheW91dDsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gVmVydGljYWxTdGFjaygpIHtcclxuXHJcbiAgICB0aGlzLmlzTGF5b3V0UGFuZWwgPSB0cnVlO1xyXG4gICAgdGhpcy5jaGlsZFBhbmVscyA9IFtdO1xyXG4gICAgdGhpcy5lR3VpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICB0aGlzLmVHdWkuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xyXG59XHJcblxyXG5WZXJ0aWNhbFN0YWNrLnByb3RvdHlwZS5hZGRQYW5lbCA9IGZ1bmN0aW9uKHBhbmVsLCBoZWlnaHQpIHtcclxuICAgIHZhciBjb21wb25lbnQ7XHJcbiAgICBpZiAocGFuZWwuaXNMYXlvdXRQYW5lbCkge1xyXG4gICAgICAgIHRoaXMuY2hpbGRQYW5lbHMucHVzaChwYW5lbCk7XHJcbiAgICAgICAgY29tcG9uZW50ID0gcGFuZWwuZ2V0R3VpKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbXBvbmVudCA9IHBhbmVsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChoZWlnaHQpIHtcclxuICAgICAgICBjb21wb25lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgfVxyXG4gICAgdGhpcy5lR3VpLmFwcGVuZENoaWxkKGNvbXBvbmVudCk7XHJcbn07XHJcblxyXG5WZXJ0aWNhbFN0YWNrLnByb3RvdHlwZS5nZXRHdWkgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmVHdWk7XHJcbn07XHJcblxyXG5WZXJ0aWNhbFN0YWNrLnByb3RvdHlwZS5kb0xheW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGk8dGhpcy5jaGlsZFBhbmVscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMuY2hpbGRQYW5lbHNbaV0uZG9MYXlvdXQoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmVydGljYWxTdGFjazsiLCJ2YXIgZ3JvdXBDcmVhdG9yID0gcmVxdWlyZSgnLi8uLi9ncm91cENyZWF0b3InKTtcclxudmFyIGV4cGFuZENyZWF0b3IgPSByZXF1aXJlKCcuLy4uL2V4cGFuZENyZWF0b3InKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi8uLi9jb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIEluTWVtb3J5Um93Q29udHJvbGxlcigpIHtcclxuICAgIHRoaXMuY3JlYXRlTW9kZWwoKTtcclxufVxyXG5cclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW5Nb2RlbCwgYW5ndWxhckdyaWQsIGZpbHRlck1hbmFnZXIsICRzY29wZSwgZXhwcmVzc2lvblNlcnZpY2UpIHtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdGhpcy5jb2x1bW5Nb2RlbCA9IGNvbHVtbk1vZGVsO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xyXG4gICAgdGhpcy5maWx0ZXJNYW5hZ2VyID0gZmlsdGVyTWFuYWdlcjtcclxuICAgIHRoaXMuJHNjb3BlID0gJHNjb3BlO1xyXG4gICAgdGhpcy5leHByZXNzaW9uU2VydmljZSA9IGV4cHJlc3Npb25TZXJ2aWNlO1xyXG5cclxuICAgIHRoaXMuYWxsUm93cyA9IG51bGw7XHJcbiAgICB0aGlzLnJvd3NBZnRlckdyb3VwID0gbnVsbDtcclxuICAgIHRoaXMucm93c0FmdGVyRmlsdGVyID0gbnVsbDtcclxuICAgIHRoaXMucm93c0FmdGVyU29ydCA9IG51bGw7XHJcbiAgICB0aGlzLnJvd3NBZnRlck1hcCA9IG51bGw7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlTW9kZWwgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHRoaXMubW9kZWwgPSB7XHJcbiAgICAgICAgLy8gdGhpcyBtZXRob2QgaXMgaW1wbGVtZW50ZWQgYnkgdGhlIGluTWVtb3J5IG1vZGVsIG9ubHksXHJcbiAgICAgICAgLy8gaXQgZ2l2ZXMgdGhlIHRvcCBsZXZlbCBvZiB0aGUgc2VsZWN0aW9uLiB1c2VkIGJ5IHRoZSBzZWxlY3Rpb25cclxuICAgICAgICAvLyBjb250cm9sbGVyLCB3aGVuIGl0IG5lZWRzIHRvIGRvIGEgZnVsbCB0cmF2ZXJzYWxcclxuICAgICAgICBnZXRUb3BMZXZlbE5vZGVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93c0FmdGVyR3JvdXA7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRWaXJ0dWFsUm93OiBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5yb3dzQWZ0ZXJNYXBbaW5kZXhdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VmlydHVhbFJvd0NvdW50OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoYXQucm93c0FmdGVyTWFwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhhdC5yb3dzQWZ0ZXJNYXAubGVuZ3RoO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvckVhY2hJbk1lbW9yeTogZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhhdC5mb3JFYWNoSW5NZW1vcnkoY2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn07XHJcblxyXG4vLyBwdWJsaWNcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMubW9kZWw7XHJcbn07XHJcblxyXG4vLyBwdWJsaWNcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5mb3JFYWNoSW5NZW1vcnkgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cclxuICAgIC8vIGl0ZXJhdGVzIHRocm91Z2ggZWFjaCBpdGVtIGluIG1lbW9yeSwgYW5kIGNhbGxzIHRoZSBjYWxsYmFjayBmdW5jdGlvblxyXG4gICAgZnVuY3Rpb24gZG9DYWxsYmFjayhsaXN0LCBjYWxsYmFjaykge1xyXG4gICAgICAgIGlmIChsaXN0KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpPGxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gbGlzdFtpXTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uZ3JvdXAgJiYgZ3JvdXAuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBkb0NhbGxiYWNrKGdyb3VwLmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkb0NhbGxiYWNrKHRoaXMucm93c0FmdGVyR3JvdXAsIGNhbGxiYWNrKTtcclxufTtcclxuXHJcbi8vIHB1YmxpY1xyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZU1vZGVsID0gZnVuY3Rpb24oc3RlcCkge1xyXG5cclxuICAgIC8vIGZhbGx0aHJvdWdoIGluIGJlbG93IHN3aXRjaCBpcyBvbiBwdXJwb3NlXHJcbiAgICBzd2l0Y2ggKHN0ZXApIHtcclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEVQX0VWRVJZVEhJTkc6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHMuU1RFUF9GSUxURVI6XHJcbiAgICAgICAgICAgIHRoaXMuZG9GaWx0ZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5kb0FnZ3JlZ2F0ZSgpO1xyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzLlNURVBfU09SVDpcclxuICAgICAgICAgICAgdGhpcy5kb1NvcnQoKTtcclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEVQX01BUDpcclxuICAgICAgICAgICAgdGhpcy5kb0dyb3VwTWFwcGluZygpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0TW9kZWxVcGRhdGVkKCkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRNb2RlbFVwZGF0ZWQoKSgpO1xyXG4gICAgICAgIHZhciAkc2NvcGUgPSB0aGlzLiRzY29wZTtcclxuICAgICAgICBpZiAoJHNjb3BlKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XHJcbiAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZGVmYXVsdEdyb3VwQWdnRnVuY3Rpb25GYWN0b3J5ID0gZnVuY3Rpb24oZ3JvdXBBZ2dGaWVsZHMpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiBncm91cEFnZ0Z1bmN0aW9uKHJvd3MpIHtcclxuXHJcbiAgICAgICAgdmFyIHN1bXMgPSB7fTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGo8Z3JvdXBBZ2dGaWVsZHMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgdmFyIGNvbEtleSA9IGdyb3VwQWdnRmllbGRzW2pdO1xyXG4gICAgICAgICAgICB2YXIgdG90YWxGb3JDb2x1bW4gPSBudWxsO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaTxyb3dzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcm93ID0gcm93c1tpXTtcclxuICAgICAgICAgICAgICAgIHZhciB0aGlzQ29sdW1uVmFsdWUgPSByb3cuZGF0YVtjb2xLZXldO1xyXG4gICAgICAgICAgICAgICAgLy8gb25seSBpbmNsdWRlIGlmIHRoZSB2YWx1ZSBpcyBhIG51bWJlclxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzQ29sdW1uVmFsdWUgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxGb3JDb2x1bW4gKz0gdGhpc0NvbHVtblZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGF0IHRoaXMgcG9pbnQsIGlmIG5vIHZhbHVlcyB3ZXJlIG51bWJlcnMsIHRoZSByZXN1bHQgaXMgbnVsbCAobm90IHplcm8pXHJcbiAgICAgICAgICAgIHN1bXNbY29sS2V5XSA9IHRvdGFsRm9yQ29sdW1uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHN1bXM7XHJcblxyXG4gICAgfTtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKGRhdGEsIGNvbERlZiwgbm9kZSwgcm93SW5kZXgpIHtcclxuICAgIHZhciBhcGkgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKTtcclxuICAgIHZhciBjb250ZXh0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpO1xyXG4gICAgcmV0dXJuIHV0aWxzLmdldFZhbHVlKHRoaXMuZXhwcmVzc2lvblNlcnZpY2UsIGRhdGEsIGNvbERlZiwgbm9kZSwgcm93SW5kZXgsIGFwaSwgY29udGV4dCk7XHJcbn07XHJcblxyXG4vLyBwdWJsaWMgLSBpdCdzIHBvc3NpYmxlIHRvIHJlY29tcHV0ZSB0aGUgYWdncmVnYXRlIHdpdGhvdXQgZG9pbmcgdGhlIG90aGVyIHBhcnRzXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZG9BZ2dyZWdhdGUgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICB2YXIgZ3JvdXBBZ2dGdW5jdGlvbiA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEdyb3VwQWdnRnVuY3Rpb24oKTtcclxuICAgIGlmICh0eXBlb2YgZ3JvdXBBZ2dGdW5jdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlDcmVhdGVBZ2dEYXRhKHRoaXMucm93c0FmdGVyRmlsdGVyLCBncm91cEFnZ0Z1bmN0aW9uKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGdyb3VwQWdnRmllbGRzID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBBZ2dGaWVsZHMoKTtcclxuICAgIGlmIChncm91cEFnZ0ZpZWxkcykge1xyXG4gICAgICAgIHZhciBkZWZhdWx0QWdnRnVuY3Rpb24gPSB0aGlzLmRlZmF1bHRHcm91cEFnZ0Z1bmN0aW9uRmFjdG9yeShncm91cEFnZ0ZpZWxkcyk7XHJcbiAgICAgICAgdGhpcy5yZWN1cnNpdmVseUNyZWF0ZUFnZ0RhdGEodGhpcy5yb3dzQWZ0ZXJGaWx0ZXIsIGRlZmF1bHRBZ2dGdW5jdGlvbik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcbi8vIHB1YmxpY1xyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmV4cGFuZE9yQ29sbGFwc2VBbGwgPSBmdW5jdGlvbihleHBhbmQsIHJvd05vZGVzKSB7XHJcbiAgICAvLyBpZiBmaXJzdCBjYWxsIGluIHJlY3Vyc2lvbiwgd2Ugc2V0IGxpc3QgdG8gcGFyZW50IGxpc3RcclxuICAgIGlmIChyb3dOb2RlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgIHJvd05vZGVzID0gdGhpcy5yb3dzQWZ0ZXJHcm91cDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXJvd05vZGVzKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICByb3dOb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICBpZiAobm9kZS5ncm91cCkge1xyXG4gICAgICAgICAgICBub2RlLmV4cGFuZGVkID0gZXhwYW5kO1xyXG4gICAgICAgICAgICBfdGhpcy5leHBhbmRPckNvbGxhcHNlQWxsKGV4cGFuZCwgbm9kZS5jaGlsZHJlbik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUucmVjdXJzaXZlbHlDcmVhdGVBZ2dEYXRhID0gZnVuY3Rpb24obm9kZXMsIGdyb3VwQWdnRnVuY3Rpb24pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgICBpZiAobm9kZS5ncm91cCkge1xyXG4gICAgICAgICAgICAvLyBhZ2cgZnVuY3Rpb24gbmVlZHMgdG8gc3RhcnQgYXQgdGhlIGJvdHRvbSwgc28gdHJhdmVyc2UgZmlyc3RcclxuICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseUNyZWF0ZUFnZ0RhdGEobm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyLCBncm91cEFnZ0Z1bmN0aW9uKTtcclxuICAgICAgICAgICAgLy8gYWZ0ZXIgdHJhdmVyc2FsLCB3ZSBjYW4gbm93IGRvIHRoZSBhZ2cgYXQgdGhpcyBsZXZlbFxyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IGdyb3VwQWdnRnVuY3Rpb24obm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyKTtcclxuICAgICAgICAgICAgbm9kZS5kYXRhID0gZGF0YTtcclxuICAgICAgICAgICAgLy8gaWYgd2UgYXJlIGdyb3VwaW5nLCB0aGVuIGl0J3MgcG9zc2libGUgdGhlcmUgaXMgYSBzaWJsaW5nIGZvb3RlclxyXG4gICAgICAgICAgICAvLyB0byB0aGUgZ3JvdXAsIHNvIHVwZGF0ZSB0aGUgZGF0YSBoZXJlIGFsc28gaWYgdGhlcmUgaXMgb25lXHJcbiAgICAgICAgICAgIGlmIChub2RlLnNpYmxpbmcpIHtcclxuICAgICAgICAgICAgICAgIG5vZGUuc2libGluZy5kYXRhID0gZGF0YTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb1NvcnQgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBzb3J0aW5nO1xyXG5cclxuICAgIC8vIGlmIHRoZSBzb3J0aW5nIGlzIGFscmVhZHkgZG9uZSBieSB0aGUgc2VydmVyLCB0aGVuIHdlIHNob3VsZCBub3QgZG8gaXQgaGVyZVxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xyXG4gICAgICAgIHNvcnRpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy9zZWUgaWYgdGhlcmUgaXMgYSBjb2wgd2UgYXJlIHNvcnRpbmcgYnlcclxuICAgICAgICB2YXIgc29ydGluZ09wdGlvbnMgPSBbXTtcclxuICAgICAgICB0aGlzLmNvbHVtbk1vZGVsLmdldEFsbENvbHVtbnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xyXG4gICAgICAgICAgICBpZiAoY29sdW1uLnNvcnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhc2NlbmRpbmcgPSBjb2x1bW4uc29ydCA9PT0gY29uc3RhbnRzLkFTQztcclxuICAgICAgICAgICAgICAgIHNvcnRpbmdPcHRpb25zLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGludmVydGVyOiBhc2NlbmRpbmcgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgc29ydGVkQXQ6IGNvbHVtbi5zb3J0ZWRBdCxcclxuICAgICAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbHVtbi5jb2xEZWZcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKHNvcnRpbmdPcHRpb25zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgc29ydGluZyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciByb3dOb2Rlc1JlYWR5Rm9yU29ydGluZyA9IHRoaXMucm93c0FmdGVyRmlsdGVyID8gdGhpcy5yb3dzQWZ0ZXJGaWx0ZXIuc2xpY2UoMCkgOiBudWxsO1xyXG5cclxuICAgIGlmIChzb3J0aW5nKSB7XHJcbiAgICAgICAgLy8gVGhlIGNvbHVtbnMgYXJlIHRvIGJlIHNvcnRlZCBpbiB0aGUgb3JkZXIgdGhhdCB0aGUgdXNlciBzZWxlY3RlZCB0aGVtOlxyXG4gICAgICAgIHNvcnRpbmdPcHRpb25zLnNvcnQoZnVuY3Rpb24ob3B0aW9uQSwgb3B0aW9uQil7XHJcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25BLnNvcnRlZEF0IC0gb3B0aW9uQi5zb3J0ZWRBdDtcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnNvcnRMaXN0KHJvd05vZGVzUmVhZHlGb3JTb3J0aW5nLCBzb3J0aW5nT3B0aW9ucyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIGlmIG5vIHNvcnRpbmcsIHNldCBhbGwgZ3JvdXAgY2hpbGRyZW4gYWZ0ZXIgc29ydCB0byB0aGUgb3JpZ2luYWwgbGlzdC5cclxuICAgICAgICAvLyBub3RlOiBpdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcywgZXZlbiBpZiBkb2luZyBzZXJ2ZXIgc2lkZSBzb3J0aW5nLFxyXG4gICAgICAgIC8vIHRvIGFsbG93IHRoZSByb3dzIHRvIHBhc3MgdG8gdGhlIG5leHQgc3RhZ2UgKGllIHNldCB0aGUgbm9kZSB2YWx1ZVxyXG4gICAgICAgIC8vIGNoaWxkcmVuQWZ0ZXJTb3J0KVxyXG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlSZXNldFNvcnQocm93Tm9kZXNSZWFkeUZvclNvcnRpbmcpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucm93c0FmdGVyU29ydCA9IHJvd05vZGVzUmVhZHlGb3JTb3J0aW5nO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnJlY3Vyc2l2ZWx5UmVzZXRTb3J0ID0gZnVuY3Rpb24ocm93Tm9kZXMpIHtcclxuICAgIGlmICghcm93Tm9kZXMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHJvd05vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIHZhciBpdGVtID0gcm93Tm9kZXNbaV07XHJcbiAgICAgICAgaWYgKGl0ZW0uZ3JvdXAgJiYgaXRlbS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBpdGVtLmNoaWxkcmVuQWZ0ZXJTb3J0ID0gaXRlbS5jaGlsZHJlbkFmdGVyRmlsdGVyO1xyXG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5UmVzZXRTb3J0KGl0ZW0uY2hpbGRyZW4pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5zb3J0TGlzdCA9IGZ1bmN0aW9uKG5vZGVzLCBzb3J0T3B0aW9ucykge1xyXG5cclxuICAgIC8vIHNvcnQgYW55IGdyb3VwcyByZWN1cnNpdmVseVxyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHsgLy8gY3JpdGljYWwgc2VjdGlvbiwgbm8gZnVuY3Rpb25hbCBwcm9ncmFtbWluZ1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XHJcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuQWZ0ZXJTb3J0ID0gbm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyLnNsaWNlKDApO1xyXG4gICAgICAgICAgICB0aGlzLnNvcnRMaXN0KG5vZGUuY2hpbGRyZW5BZnRlclNvcnQsIHNvcnRPcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgZnVuY3Rpb24gY29tcGFyZShvYmpBLCBvYmpCLCBjb2xEZWYpe1xyXG4gICAgICAgIHZhciB2YWx1ZUEgPSB0aGF0LmdldFZhbHVlKG9iakEuZGF0YSwgY29sRGVmLCBvYmpBKTtcclxuICAgICAgICB2YXIgdmFsdWVCID0gdGhhdC5nZXRWYWx1ZShvYmpCLmRhdGEsIGNvbERlZiwgb2JqQik7XHJcbiAgICAgICAgaWYgKGNvbERlZi5jb21wYXJhdG9yKSB7XHJcbiAgICAgICAgICAgIC8vaWYgY29tcGFyYXRvciBwcm92aWRlZCwgdXNlIGl0XHJcbiAgICAgICAgICAgIHJldHVybiBjb2xEZWYuY29tcGFyYXRvcih2YWx1ZUEsIHZhbHVlQiwgb2JqQSwgb2JqQik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy9vdGhlcndpc2UgZG8gb3VyIG93biBjb21wYXJpc29uXHJcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5kZWZhdWx0Q29tcGFyYXRvcih2YWx1ZUEsIHZhbHVlQiwgb2JqQSwgb2JqQik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5vZGVzLnNvcnQoZnVuY3Rpb24ob2JqQSwgb2JqQikge1xyXG4gICAgICAgIC8vIEl0ZXJhdGUgY29sdW1ucywgcmV0dXJuIHRoZSBmaXJzdCB0aGF0IGRvZXNuJ3QgbWF0Y2hcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc29ydE9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvcnRPcHRpb24gPSBzb3J0T3B0aW9uc1tpXTtcclxuICAgICAgICAgICAgdmFyIGNvbXBhcmVkID0gY29tcGFyZShvYmpBLCBvYmpCLCBzb3J0T3B0aW9uLmNvbERlZik7XHJcbiAgICAgICAgICAgIGlmIChjb21wYXJlZCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmVkICogc29ydE9wdGlvbi5pbnZlcnRlcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBBbGwgbWF0Y2hlZCwgdGhlc2UgYXJlIGlkZW50aWNhbCBhcyBmYXIgYXMgdGhlIHNvcnQgaXMgY29uY2VybmVkOlxyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZG9Hcm91cGluZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHJvd3NBZnRlckdyb3VwO1xyXG4gICAgdmFyIGdyb3VwZWRDb2xzID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRHcm91cGVkQ29sdW1ucygpO1xyXG4gICAgdmFyIHJvd3NBbHJlYWR5R3JvdXBlZCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93c0FscmVhZHlHcm91cGVkKCk7XHJcblxyXG4gICAgdmFyIGRvaW5nR3JvdXBpbmcgPSAhcm93c0FscmVhZHlHcm91cGVkICYmIGdyb3VwZWRDb2xzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgaWYgKGRvaW5nR3JvdXBpbmcpIHtcclxuICAgICAgICB2YXIgZXhwYW5kQnlEZWZhdWx0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBEZWZhdWx0RXhwYW5kZWQoKTtcclxuICAgICAgICByb3dzQWZ0ZXJHcm91cCA9IGdyb3VwQ3JlYXRvci5ncm91cCh0aGlzLmFsbFJvd3MsIGdyb3VwZWRDb2xzLFxyXG4gICAgICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRHcm91cEFnZ0Z1bmN0aW9uKCksIGV4cGFuZEJ5RGVmYXVsdCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvd3NBZnRlckdyb3VwID0gdGhpcy5hbGxSb3dzO1xyXG4gICAgfVxyXG4gICAgdGhpcy5yb3dzQWZ0ZXJHcm91cCA9IHJvd3NBZnRlckdyb3VwO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmRvRXhwYW5kaW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgcm93c0FmdGVyR3JvdXA7XHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNEb0ludGVybmFsRXhwYW5kaW5nKCkpIHtcclxuICAgICAgICByb3dzQWZ0ZXJHcm91cCA9IGV4cGFuZENyZWF0b3IuZ3JvdXAodGhpcy5hbGxSb3dzKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm93c0FmdGVyR3JvdXAgPSB0aGlzLmFsbFJvd3M7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJvd3NBZnRlckdyb3VwID0gcm93c0FmdGVyR3JvdXA7XHJcbn07XHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb0ZpbHRlciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGRvaW5nRmlsdGVyO1xyXG5cclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZVNlcnZlclNpZGVGaWx0ZXIoKSkge1xyXG4gICAgICAgIGRvaW5nRmlsdGVyID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBxdWlja0ZpbHRlclByZXNlbnQgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldFF1aWNrRmlsdGVyKCkgIT09IG51bGw7XHJcbiAgICAgICAgdmFyIGFkdmFuY2VkRmlsdGVyUHJlc2VudCA9IHRoaXMuZmlsdGVyTWFuYWdlci5pc0ZpbHRlclByZXNlbnQoKTtcclxuICAgICAgICBkb2luZ0ZpbHRlciA9IHF1aWNrRmlsdGVyUHJlc2VudCB8fCBhZHZhbmNlZEZpbHRlclByZXNlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJvd3NBZnRlckZpbHRlcjtcclxuICAgIGlmIChkb2luZ0ZpbHRlcikge1xyXG4gICAgICAgIHJvd3NBZnRlckZpbHRlciA9IHRoaXMuZmlsdGVySXRlbXModGhpcy5yb3dzQWZ0ZXJHcm91cCwgcXVpY2tGaWx0ZXJQcmVzZW50LCBhZHZhbmNlZEZpbHRlclByZXNlbnQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBkbyBpdCBoZXJlXHJcbiAgICAgICAgcm93c0FmdGVyRmlsdGVyID0gdGhpcy5yb3dzQWZ0ZXJHcm91cDtcclxuICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5UmVzZXRGaWx0ZXIodGhpcy5yb3dzQWZ0ZXJHcm91cCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJvd3NBZnRlckZpbHRlciA9IHJvd3NBZnRlckZpbHRlcjtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5maWx0ZXJJdGVtcyA9IGZ1bmN0aW9uKHJvd05vZGVzLCBxdWlja0ZpbHRlclByZXNlbnQsIGFkdmFuY2VkRmlsdGVyUHJlc2VudCkge1xyXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gcm93Tm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSByb3dOb2Rlc1tpXTtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICAgICAgLy8gZGVhbCB3aXRoIGdyb3VwXHJcbiAgICAgICAgICAgIG5vZGUuY2hpbGRyZW5BZnRlckZpbHRlciA9IHRoaXMuZmlsdGVySXRlbXMobm9kZS5jaGlsZHJlbiwgcXVpY2tGaWx0ZXJQcmVzZW50LCBhZHZhbmNlZEZpbHRlclByZXNlbnQpO1xyXG4gICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIG5vZGUuYWxsQ2hpbGRyZW5Db3VudCA9IHRoaXMuZ2V0VG90YWxDaGlsZENvdW50KG5vZGUuY2hpbGRyZW5BZnRlckZpbHRlcik7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChub2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRvZXNSb3dQYXNzRmlsdGVyKG5vZGUsIHF1aWNrRmlsdGVyUHJlc2VudCwgYWR2YW5jZWRGaWx0ZXJQcmVzZW50KSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseVJlc2V0RmlsdGVyID0gZnVuY3Rpb24obm9kZXMpIHtcclxuICAgIGlmICghbm9kZXMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XHJcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuQWZ0ZXJGaWx0ZXIgPSBub2RlLmNoaWxkcmVuO1xyXG4gICAgICAgICAgICBub2RlLmFsbENoaWxkcmVuQ291bnQgPSB0aGlzLmdldFRvdGFsQ2hpbGRDb3VudChub2RlLmNoaWxkcmVuQWZ0ZXJGaWx0ZXIpO1xyXG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5UmVzZXRGaWx0ZXIobm9kZS5jaGlsZHJlbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG4vLyByb3dzOiB0aGUgcm93cyB0byBwdXQgaW50byB0aGUgbW9kZWxcclxuLy8gZmlyc3RJZDogdGhlIGZpcnN0IGlkIHRvIHVzZSwgdXNlZCBmb3IgcGFnaW5nLCB3aGVyZSB3ZSBhcmUgbm90IG9uIHRoZSBmaXJzdCBwYWdlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuc2V0QWxsUm93cyA9IGZ1bmN0aW9uKHJvd3MsIGZpcnN0SWQpIHtcclxuICAgIHZhciBub2RlcztcclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc1Jvd3NBbHJlYWR5R3JvdXBlZCgpKSB7XHJcbiAgICAgICAgbm9kZXMgPSByb3dzO1xyXG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlDaGVja1VzZXJQcm92aWRlZE5vZGVzKG5vZGVzLCBudWxsLCAwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gcGxhY2UgZWFjaCByb3cgaW50byBhIHdyYXBwZXJcclxuICAgICAgICB2YXIgbm9kZXMgPSBbXTtcclxuICAgICAgICBpZiAocm93cykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpKyspIHsgLy8gY291bGQgYmUgbG90cyBvZiByb3dzLCBkb24ndCB1c2UgZnVuY3Rpb25hbCBwcm9ncmFtbWluZ1xyXG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcm93c1tpXVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgZmlyc3RJZCBwcm92aWRlZCwgdXNlIGl0LCBvdGhlcndpc2Ugc3RhcnQgYXQgMFxyXG4gICAgdmFyIGZpcnN0SWRUb1VzZSA9IGZpcnN0SWQgPyBmaXJzdElkIDogMDtcclxuICAgIHRoaXMucmVjdXJzaXZlbHlBZGRJZFRvTm9kZXMobm9kZXMsIGZpcnN0SWRUb1VzZSk7XHJcbiAgICB0aGlzLmFsbFJvd3MgPSBub2RlcztcclxuXHJcbiAgICAvLyBhZ2dyZWdhdGUgaGVyZSwgc28gZmlsdGVycyBoYXZlIHRoZSBhZ2cgZGF0YSByZWFkeVxyXG4gICAgdGhpcy5kb0dyb3VwaW5nKCk7XHJcbiAgICAvLyBwcm9jZXNzIGhlcmUgdGhlIGV4cGFuZGVkXHJcbiAgICB0aGlzLmRvRXhwYW5kaW5nKCk7XHJcbn07XHJcblxyXG4vLyBhZGQgaW4gaW5kZXggLSB0aGlzIGlzIHVzZWQgYnkgdGhlIHNlbGVjdGlvbkNvbnRyb2xsZXIgLSBzbyBxdWlja1xyXG4vLyB0byBsb29rIHVwIHNlbGVjdGVkIHJvd3NcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseUFkZElkVG9Ob2RlcyA9IGZ1bmN0aW9uKG5vZGVzLCBpbmRleCkge1xyXG4gICAgaWYgKCFub2Rlcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICAgIG5vZGUuaWQgPSBpbmRleCsrO1xyXG4gICAgICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgaW5kZXggPSB0aGlzLnJlY3Vyc2l2ZWx5QWRkSWRUb05vZGVzKG5vZGUuY2hpbGRyZW4sIGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gaW5kZXg7XHJcbn07XHJcblxyXG4vLyBhZGQgaW4gaW5kZXggLSB0aGlzIGlzIHVzZWQgYnkgdGhlIHNlbGVjdGlvbkNvbnRyb2xsZXIgLSBzbyBxdWlja1xyXG4vLyB0byBsb29rIHVwIHNlbGVjdGVkIHJvd3NcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseUNoZWNrVXNlclByb3ZpZGVkTm9kZXMgPSBmdW5jdGlvbihub2RlcywgcGFyZW50LCBsZXZlbCkge1xyXG4gICAgaWYgKCFub2Rlcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5vZGUubGV2ZWwgPSBsZXZlbDtcclxuICAgICAgICBpZiAobm9kZS5ncm91cCAmJiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlDaGVja1VzZXJQcm92aWRlZE5vZGVzKG5vZGUuY2hpbGRyZW4sIG5vZGUsIGxldmVsICsgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmdldFRvdGFsQ2hpbGRDb3VudCA9IGZ1bmN0aW9uKHJvd05vZGVzKSB7XHJcbiAgICB2YXIgY291bnQgPSAwO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSByb3dOb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICB2YXIgaXRlbSA9IHJvd05vZGVzW2ldO1xyXG4gICAgICAgIGlmIChpdGVtLmdyb3VwKSB7XHJcbiAgICAgICAgICAgIGNvdW50ICs9IGl0ZW0uYWxsQ2hpbGRyZW5Db3VudDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjb3VudDtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jb3B5R3JvdXBOb2RlID0gZnVuY3Rpb24oZ3JvdXBOb2RlLCBjaGlsZHJlbiwgYWxsQ2hpbGRyZW5Db3VudCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBncm91cDogdHJ1ZSxcclxuICAgICAgICBkYXRhOiBncm91cE5vZGUuZGF0YSxcclxuICAgICAgICBmaWVsZDogZ3JvdXBOb2RlLmZpZWxkLFxyXG4gICAgICAgIGtleTogZ3JvdXBOb2RlLmtleSxcclxuICAgICAgICBleHBhbmRlZDogZ3JvdXBOb2RlLmV4cGFuZGVkLFxyXG4gICAgICAgIGNoaWxkcmVuOiBjaGlsZHJlbixcclxuICAgICAgICBhbGxDaGlsZHJlbkNvdW50OiBhbGxDaGlsZHJlbkNvdW50LFxyXG4gICAgICAgIGxldmVsOiBncm91cE5vZGUubGV2ZWxcclxuICAgIH07XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZG9Hcm91cE1hcHBpbmcgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIGV2ZW4gaWYgbm90IGdvaW5nIGdyb3VwaW5nLCB3ZSBkbyB0aGUgbWFwcGluZywgYXMgdGhlIGNsaWVudCBtaWdodFxyXG4gICAgLy8gb2YgcGFzc2VkIGluIGRhdGEgdGhhdCBhbHJlYWR5IGhhcyBhIGdyb3VwaW5nIGluIGl0IHNvbWV3aGVyZVxyXG4gICAgdmFyIHJvd3NBZnRlck1hcCA9IFtdO1xyXG4gICAgdGhpcy5hZGRUb01hcChyb3dzQWZ0ZXJNYXAsIHRoaXMucm93c0FmdGVyU29ydCk7XHJcbiAgICB0aGlzLnJvd3NBZnRlck1hcCA9IHJvd3NBZnRlck1hcDtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5hZGRUb01hcCA9IGZ1bmN0aW9uKG1hcHBlZERhdGEsIG9yaWdpbmFsTm9kZXMpIHtcclxuICAgIGlmICghb3JpZ2luYWxOb2Rlcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JpZ2luYWxOb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBub2RlID0gb3JpZ2luYWxOb2Rlc1tpXTtcclxuICAgICAgICBtYXBwZWREYXRhLnB1c2gobm9kZSk7XHJcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5leHBhbmRlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZFRvTWFwKG1hcHBlZERhdGEsIG5vZGUuY2hpbGRyZW5BZnRlclNvcnQpO1xyXG5cclxuICAgICAgICAgICAgLy8gcHV0IGEgZm9vdGVyIGluIGlmIHVzZXIgaXMgbG9va2luZyBmb3IgaXRcclxuICAgICAgICAgICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBJbmNsdWRlRm9vdGVyKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmb290ZXJOb2RlID0gdGhpcy5jcmVhdGVGb290ZXJOb2RlKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgbWFwcGVkRGF0YS5wdXNoKGZvb3Rlck5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmNyZWF0ZUZvb3Rlck5vZGUgPSBmdW5jdGlvbihncm91cE5vZGUpIHtcclxuICAgIHZhciBmb290ZXJOb2RlID0ge307XHJcbiAgICBPYmplY3Qua2V5cyhncm91cE5vZGUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgZm9vdGVyTm9kZVtrZXldID0gZ3JvdXBOb2RlW2tleV07XHJcbiAgICB9KTtcclxuICAgIGZvb3Rlck5vZGUuZm9vdGVyID0gdHJ1ZTtcclxuICAgIC8vIGdldCBib3RoIGhlYWRlciBhbmQgZm9vdGVyIHRvIHJlZmVyZW5jZSBlYWNoIG90aGVyIGFzIHNpYmxpbmdzLiB0aGlzIGlzIG5ldmVyIHVuZG9uZSxcclxuICAgIC8vIG9ubHkgb3ZlcndyaXR0ZW4uIHNvIGlmIGEgZ3JvdXAgaXMgZXhwYW5kZWQsIHRoZW4gY29udHJhY3RlZCwgaXQgd2lsbCBoYXZlIGEgZ2hvc3RcclxuICAgIC8vIHNpYmxpbmcgLSBidXQgdGhhdCdzIGZpbmUsIGFzIHdlIGNhbiBpZ25vcmUgdGhpcyBpZiB0aGUgaGVhZGVyIGlzIGNvbnRyYWN0ZWQuXHJcbiAgICBmb290ZXJOb2RlLnNpYmxpbmcgPSBncm91cE5vZGU7XHJcbiAgICBncm91cE5vZGUuc2libGluZyA9IGZvb3Rlck5vZGU7XHJcbiAgICByZXR1cm4gZm9vdGVyTm9kZTtcclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb2VzUm93UGFzc0ZpbHRlciA9IGZ1bmN0aW9uKG5vZGUsIHF1aWNrRmlsdGVyUHJlc2VudCwgYWR2YW5jZWRGaWx0ZXJQcmVzZW50KSB7XHJcbiAgICAvL2ZpcnN0IHVwLCBjaGVjayBxdWljayBmaWx0ZXJcclxuICAgIGlmIChxdWlja0ZpbHRlclByZXNlbnQpIHtcclxuICAgICAgICBpZiAoIW5vZGUucXVpY2tGaWx0ZXJBZ2dyZWdhdGVUZXh0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWdncmVnYXRlUm93Rm9yUXVpY2tGaWx0ZXIobm9kZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChub2RlLnF1aWNrRmlsdGVyQWdncmVnYXRlVGV4dC5pbmRleE9mKHRoaXMuYW5ndWxhckdyaWQuZ2V0UXVpY2tGaWx0ZXIoKSkgPCAwKSB7XHJcbiAgICAgICAgICAgIC8vcXVpY2sgZmlsdGVyIGZhaWxzLCBzbyBza2lwIGl0ZW1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL3NlY29uZCwgY2hlY2sgYWR2YW5jZWQgZmlsdGVyXHJcbiAgICBpZiAoYWR2YW5jZWRGaWx0ZXJQcmVzZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbHRlck1hbmFnZXIuZG9lc0ZpbHRlclBhc3Mobm9kZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL2dvdCB0aGlzIGZhciwgYWxsIGZpbHRlcnMgcGFzc1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuYWdncmVnYXRlUm93Rm9yUXVpY2tGaWx0ZXIgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgYWdncmVnYXRlZFRleHQgPSAnJztcclxuICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sRGVmV3JhcHBlcikge1xyXG4gICAgICAgIHZhciBkYXRhID0gbm9kZS5kYXRhO1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IGRhdGEgPyBkYXRhW2NvbERlZldyYXBwZXIuY29sRGVmLmZpZWxkXSA6IG51bGw7XHJcbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSAnJykge1xyXG4gICAgICAgICAgICBhZ2dyZWdhdGVkVGV4dCA9IGFnZ3JlZ2F0ZWRUZXh0ICsgdmFsdWUudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpICsgXCJfXCI7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBub2RlLnF1aWNrRmlsdGVyQWdncmVnYXRlVGV4dCA9IGFnZ3JlZ2F0ZWRUZXh0O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJbk1lbW9yeVJvd0NvbnRyb2xsZXI7XHJcbiIsInZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vcGFnaW5hdGlvblBhbmVsLmh0bWwnKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG5cclxuZnVuY3Rpb24gUGFnaW5hdGlvbkNvbnRyb2xsZXIoKSB7fVxyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihhbmd1bGFyR3JpZCwgZ3JpZE9wdGlvbnNXcmFwcGVyKSB7XHJcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcclxuICAgIHRoaXMuYW5ndWxhckdyaWQgPSBhbmd1bGFyR3JpZDtcclxuICAgIHRoaXMuc2V0dXBDb21wb25lbnRzKCk7XHJcbiAgICB0aGlzLmNhbGxWZXJzaW9uID0gMDtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5zZXREYXRhc291cmNlID0gZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xyXG4gICAgdGhpcy5kYXRhc291cmNlID0gZGF0YXNvdXJjZTtcclxuXHJcbiAgICBpZiAoIWRhdGFzb3VyY2UpIHtcclxuICAgICAgICAvLyBvbmx5IGNvbnRpbnVlIGlmIHdlIGhhdmUgYSB2YWxpZCBkYXRhc291cmNlIHRvIHdvcmsgd2l0aFxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJlc2V0KCk7XHJcbn07XHJcblxyXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIGNvcHkgcGFnZVNpemUsIHRvIGd1YXJkIGFnYWluc3QgaXQgY2hhbmdpbmcgdGhlIHRoZSBkYXRhc291cmNlIGJldHdlZW4gY2FsbHNcclxuICAgIGlmICh0aGlzLmRhdGFzb3VyY2UucGFnZVNpemUgJiYgdHlwZW9mIHRoaXMuZGF0YXNvdXJjZS5wYWdlU2l6ZSAhPT0gJ251bWJlcicpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ2RhdGFzb3VyY2UucGFnZVNpemUgc2hvdWxkIGJlIGEgbnVtYmVyJyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnBhZ2VTaXplID0gdGhpcy5kYXRhc291cmNlLnBhZ2VTaXplO1xyXG4gICAgLy8gc2VlIGlmIHdlIGtub3cgdGhlIHRvdGFsIG51bWJlciBvZiBwYWdlcywgb3IgaWYgaXQncyAndG8gYmUgZGVjaWRlZCdcclxuICAgIGlmICh0eXBlb2YgdGhpcy5kYXRhc291cmNlLnJvd0NvdW50ID09PSAnbnVtYmVyJyAmJiB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQgPj0gMCkge1xyXG4gICAgICAgIHRoaXMucm93Q291bnQgPSB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQ7XHJcbiAgICAgICAgdGhpcy5mb3VuZE1heFJvdyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVUb3RhbFBhZ2VzKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMucm93Q291bnQgPSAwO1xyXG4gICAgICAgIHRoaXMuZm91bmRNYXhSb3cgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnRvdGFsUGFnZXMgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAwO1xyXG5cclxuICAgIC8vIGhpZGUgdGhlIHN1bW1hcnkgcGFuZWwgdW50aWwgc29tZXRoaW5nIGlzIGxvYWRlZFxyXG4gICAgdGhpcy5lUGFnZVJvd1N1bW1hcnlQYW5lbC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XHJcblxyXG4gICAgdGhpcy5zZXRUb3RhbExhYmVscygpO1xyXG4gICAgdGhpcy5sb2FkUGFnZSgpO1xyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnNldFRvdGFsTGFiZWxzID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5mb3VuZE1heFJvdykge1xyXG4gICAgICAgIHRoaXMubGJUb3RhbC5pbm5lckhUTUwgPSB0aGlzLnRvdGFsUGFnZXMudG9Mb2NhbGVTdHJpbmcoKTtcclxuICAgICAgICB0aGlzLmxiUmVjb3JkQ291bnQuaW5uZXJIVE1MID0gdGhpcy5yb3dDb3VudC50b0xvY2FsZVN0cmluZygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgbW9yZVRleHQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRMb2NhbGVUZXh0RnVuYygpKCdtb3JlJywgJ21vcmUnKTtcclxuICAgICAgICB0aGlzLmxiVG90YWwuaW5uZXJIVE1MID0gbW9yZVRleHQ7XHJcbiAgICAgICAgdGhpcy5sYlJlY29yZENvdW50LmlubmVySFRNTCA9IG1vcmVUZXh0O1xyXG4gICAgfVxyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmNhbGN1bGF0ZVRvdGFsUGFnZXMgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMudG90YWxQYWdlcyA9IE1hdGguZmxvb3IoKHRoaXMucm93Q291bnQgLSAxKSAvIHRoaXMucGFnZVNpemUpICsgMTtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5wYWdlTG9hZGVkID0gZnVuY3Rpb24ocm93cywgbGFzdFJvd0luZGV4KSB7XHJcbiAgICB2YXIgZmlyc3RJZCA9IHRoaXMuY3VycmVudFBhZ2UgKiB0aGlzLnBhZ2VTaXplO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5zZXRSb3dzKHJvd3MsIGZpcnN0SWQpO1xyXG4gICAgLy8gc2VlIGlmIHdlIGhpdCB0aGUgbGFzdCByb3dcclxuICAgIGlmICghdGhpcy5mb3VuZE1heFJvdyAmJiB0eXBlb2YgbGFzdFJvd0luZGV4ID09PSAnbnVtYmVyJyAmJiBsYXN0Um93SW5kZXggPj0gMCkge1xyXG4gICAgICAgIHRoaXMuZm91bmRNYXhSb3cgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMucm93Q291bnQgPSBsYXN0Um93SW5kZXg7XHJcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVUb3RhbFBhZ2VzKCk7XHJcbiAgICAgICAgdGhpcy5zZXRUb3RhbExhYmVscygpO1xyXG5cclxuICAgICAgICAvLyBpZiBvdmVyc2hvdCBwYWdlcywgZ28gYmFja1xyXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRQYWdlID4gdGhpcy50b3RhbFBhZ2VzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2UgPSB0aGlzLnRvdGFsUGFnZXMgLSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRQYWdlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5lbmFibGVPckRpc2FibGVCdXR0b25zKCk7XHJcbiAgICB0aGlzLnVwZGF0ZVJvd0xhYmVscygpO1xyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZVJvd0xhYmVscyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHN0YXJ0Um93O1xyXG4gICAgdmFyIGVuZFJvdztcclxuICAgIGlmICh0aGlzLmlzWmVyb1BhZ2VzVG9EaXNwbGF5KCkpIHtcclxuICAgICAgICBzdGFydFJvdyA9IDA7XHJcbiAgICAgICAgZW5kUm93ID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc3RhcnRSb3cgPSAodGhpcy5wYWdlU2l6ZSAqIHRoaXMuY3VycmVudFBhZ2UpICsgMTtcclxuICAgICAgICBlbmRSb3cgPSBzdGFydFJvdyArIHRoaXMucGFnZVNpemUgLSAxO1xyXG4gICAgICAgIGlmICh0aGlzLmZvdW5kTWF4Um93ICYmIGVuZFJvdyA+IHRoaXMucm93Q291bnQpIHtcclxuICAgICAgICAgICAgZW5kUm93ID0gdGhpcy5yb3dDb3VudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmxiRmlyc3RSb3dPblBhZ2UuaW5uZXJIVE1MID0gKHN0YXJ0Um93KS50b0xvY2FsZVN0cmluZygpO1xyXG4gICAgdGhpcy5sYkxhc3RSb3dPblBhZ2UuaW5uZXJIVE1MID0gKGVuZFJvdykudG9Mb2NhbGVTdHJpbmcoKTtcclxuXHJcbiAgICAvLyBzaG93IHRoZSBzdW1tYXJ5IHBhbmVsLCB3aGVuIGZpcnN0IHNob3duLCB0aGlzIGlzIGJsYW5rXHJcbiAgICB0aGlzLmVQYWdlUm93U3VtbWFyeVBhbmVsLnN0eWxlLnZpc2liaWxpdHkgPSBudWxsO1xyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmxvYWRQYWdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmVuYWJsZU9yRGlzYWJsZUJ1dHRvbnMoKTtcclxuICAgIHZhciBzdGFydFJvdyA9IHRoaXMuY3VycmVudFBhZ2UgKiB0aGlzLmRhdGFzb3VyY2UucGFnZVNpemU7XHJcbiAgICB2YXIgZW5kUm93ID0gKHRoaXMuY3VycmVudFBhZ2UgKyAxKSAqIHRoaXMuZGF0YXNvdXJjZS5wYWdlU2l6ZTtcclxuXHJcbiAgICB0aGlzLmxiQ3VycmVudC5pbm5lckhUTUwgPSAodGhpcy5jdXJyZW50UGFnZSArIDEpLnRvTG9jYWxlU3RyaW5nKCk7XHJcblxyXG4gICAgdGhpcy5jYWxsVmVyc2lvbisrO1xyXG4gICAgdmFyIGNhbGxWZXJzaW9uQ29weSA9IHRoaXMuY2FsbFZlcnNpb247XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLmFuZ3VsYXJHcmlkLnNob3dMb2FkaW5nUGFuZWwodHJ1ZSk7XHJcblxyXG4gICAgdmFyIHNvcnRNb2RlbDtcclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZVNlcnZlclNpZGVTb3J0aW5nKCkpIHtcclxuICAgICAgICBzb3J0TW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldFNvcnRNb2RlbCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBmaWx0ZXJNb2RlbDtcclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZVNlcnZlclNpZGVGaWx0ZXIoKSkge1xyXG4gICAgICAgIGZpbHRlck1vZGVsID0gdGhpcy5hbmd1bGFyR3JpZC5nZXRGaWx0ZXJNb2RlbCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgc3RhcnRSb3c6IHN0YXJ0Um93LFxyXG4gICAgICAgIGVuZFJvdzogZW5kUm93LFxyXG4gICAgICAgIHN1Y2Nlc3NDYWxsYmFjazogc3VjY2Vzc0NhbGxiYWNrLFxyXG4gICAgICAgIGZhaWxDYWxsYmFjazogZmFpbENhbGxiYWNrLFxyXG4gICAgICAgIHNvcnRNb2RlbDogc29ydE1vZGVsLFxyXG4gICAgICAgIGZpbHRlck1vZGVsOiBmaWx0ZXJNb2RlbFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBjaGVjayBpZiBvbGQgdmVyc2lvbiBvZiBkYXRhc291cmNlIHVzZWRcclxuICAgIHZhciBnZXRSb3dzUGFyYW1zID0gdXRpbHMuZ2V0RnVuY3Rpb25QYXJhbWV0ZXJzKHRoaXMuZGF0YXNvdXJjZS5nZXRSb3dzKTtcclxuICAgIGlmIChnZXRSb3dzUGFyYW1zLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQ6IEl0IGxvb2tzIGxpa2UgeW91ciBwYWdpbmcgZGF0YXNvdXJjZSBpcyBvZiB0aGUgb2xkIHR5cGUsIHRha2luZyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlci4nKTtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQ6IEZyb20gYWctZ3JpZCAxLjkuMCwgbm93IHRoZSBnZXRSb3dzIHRha2VzIG9uZSBwYXJhbWV0ZXIuIFNlZSB0aGUgZG9jdW1lbnRhdGlvbiBmb3IgZGV0YWlscy4nKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRhdGFzb3VyY2UuZ2V0Um93cyhwYXJhbXMpO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayhyb3dzLCBsYXN0Um93SW5kZXgpIHtcclxuICAgICAgICBpZiAodGhhdC5pc0NhbGxEYWVtb24oY2FsbFZlcnNpb25Db3B5KSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoYXQucGFnZUxvYWRlZChyb3dzLCBsYXN0Um93SW5kZXgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZhaWxDYWxsYmFjaygpIHtcclxuICAgICAgICBpZiAodGhhdC5pc0NhbGxEYWVtb24oY2FsbFZlcnNpb25Db3B5KSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHNldCBpbiBhbiBlbXB0eSBzZXQgb2Ygcm93cywgdGhpcyB3aWxsIGF0XHJcbiAgICAgICAgLy8gbGVhc3QgZ2V0IHJpZCBvZiB0aGUgbG9hZGluZyBwYW5lbCwgYW5kXHJcbiAgICAgICAgLy8gc3RvcCBibG9ja2luZyB0aGluZ3NcclxuICAgICAgICB0aGF0LmFuZ3VsYXJHcmlkLnNldFJvd3MoW10pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmlzQ2FsbERhZW1vbiA9IGZ1bmN0aW9uKHZlcnNpb25Db3B5KSB7XHJcbiAgICByZXR1cm4gdmVyc2lvbkNvcHkgIT09IHRoaXMuY2FsbFZlcnNpb247XHJcbn07XHJcblxyXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUub25CdE5leHQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuY3VycmVudFBhZ2UrKztcclxuICAgIHRoaXMubG9hZFBhZ2UoKTtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5vbkJ0UHJldmlvdXMgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuY3VycmVudFBhZ2UtLTtcclxuICAgIHRoaXMubG9hZFBhZ2UoKTtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5vbkJ0Rmlyc3QgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAwO1xyXG4gICAgdGhpcy5sb2FkUGFnZSgpO1xyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uQnRMYXN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gdGhpcy50b3RhbFBhZ2VzIC0gMTtcclxuICAgIHRoaXMubG9hZFBhZ2UoKTtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5pc1plcm9QYWdlc1RvRGlzcGxheSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZm91bmRNYXhSb3cgJiYgdGhpcy50b3RhbFBhZ2VzID09PSAwO1xyXG59O1xyXG5cclxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmVuYWJsZU9yRGlzYWJsZUJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBkaXNhYmxlUHJldmlvdXNBbmRGaXJzdCA9IHRoaXMuY3VycmVudFBhZ2UgPT09IDA7XHJcbiAgICB0aGlzLmJ0UHJldmlvdXMuZGlzYWJsZWQgPSBkaXNhYmxlUHJldmlvdXNBbmRGaXJzdDtcclxuICAgIHRoaXMuYnRGaXJzdC5kaXNhYmxlZCA9IGRpc2FibGVQcmV2aW91c0FuZEZpcnN0O1xyXG5cclxuICAgIHZhciB6ZXJvUGFnZXNUb0Rpc3BsYXkgPSB0aGlzLmlzWmVyb1BhZ2VzVG9EaXNwbGF5KCk7XHJcbiAgICB2YXIgb25MYXN0UGFnZSA9IHRoaXMuZm91bmRNYXhSb3cgJiYgdGhpcy5jdXJyZW50UGFnZSA9PT0gKHRoaXMudG90YWxQYWdlcyAtIDEpO1xyXG5cclxuICAgIHZhciBkaXNhYmxlTmV4dCA9IG9uTGFzdFBhZ2UgfHwgemVyb1BhZ2VzVG9EaXNwbGF5O1xyXG4gICAgdGhpcy5idE5leHQuZGlzYWJsZWQgPSBkaXNhYmxlTmV4dDtcclxuXHJcbiAgICB2YXIgZGlzYWJsZUxhc3QgPSAhdGhpcy5mb3VuZE1heFJvdyB8fCB6ZXJvUGFnZXNUb0Rpc3BsYXkgfHwgdGhpcy5jdXJyZW50UGFnZSA9PT0gKHRoaXMudG90YWxQYWdlcyAtIDEpO1xyXG4gICAgdGhpcy5idExhc3QuZGlzYWJsZWQgPSBkaXNhYmxlTGFzdDtcclxufTtcclxuXHJcblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVUZW1wbGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGxvY2FsZVRleHRGdW5jID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0TG9jYWxlVGV4dEZ1bmMoKTtcclxuICAgIHJldHVybiB0ZW1wbGF0ZVxyXG4gICAgICAgIC5yZXBsYWNlKCdbUEFHRV0nLCBsb2NhbGVUZXh0RnVuYygncGFnZScsICdQYWdlJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tUT10nLCBsb2NhbGVUZXh0RnVuYygndG8nLCAndG8nKSlcclxuICAgICAgICAucmVwbGFjZSgnW09GXScsIGxvY2FsZVRleHRGdW5jKCdvZicsICdvZicpKVxyXG4gICAgICAgIC5yZXBsYWNlKCdbT0ZdJywgbG9jYWxlVGV4dEZ1bmMoJ29mJywgJ29mJykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tGSVJTVF0nLCBsb2NhbGVUZXh0RnVuYygnZmlyc3QnLCAnRmlyc3QnKSlcclxuICAgICAgICAucmVwbGFjZSgnW1BSRVZJT1VTXScsIGxvY2FsZVRleHRGdW5jKCdwcmV2aW91cycsICdQcmV2aW91cycpKVxyXG4gICAgICAgIC5yZXBsYWNlKCdbTkVYVF0nLCBsb2NhbGVUZXh0RnVuYygnbmV4dCcsICdOZXh0JykpXHJcbiAgICAgICAgLnJlcGxhY2UoJ1tMQVNUXScsIGxvY2FsZVRleHRGdW5jKCdsYXN0JywgJ0xhc3QnKSk7XHJcbn07XHJcblxyXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0R3VpPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmVHdWk7XHJcbn07XHJcblxyXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuc2V0dXBDb21wb25lbnRzID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdGhpcy5lR3VpID0gdXRpbHMubG9hZFRlbXBsYXRlKHRoaXMuY3JlYXRlVGVtcGxhdGUoKSk7XHJcblxyXG4gICAgdGhpcy5idE5leHQgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2J0TmV4dCcpO1xyXG4gICAgdGhpcy5idFByZXZpb3VzID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNidFByZXZpb3VzJyk7XHJcbiAgICB0aGlzLmJ0Rmlyc3QgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2J0Rmlyc3QnKTtcclxuICAgIHRoaXMuYnRMYXN0ID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNidExhc3QnKTtcclxuICAgIHRoaXMubGJDdXJyZW50ID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNjdXJyZW50Jyk7XHJcbiAgICB0aGlzLmxiVG90YWwgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI3RvdGFsJyk7XHJcblxyXG4gICAgdGhpcy5sYlJlY29yZENvdW50ID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNyZWNvcmRDb3VudCcpO1xyXG4gICAgdGhpcy5sYkZpcnN0Um93T25QYWdlID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNmaXJzdFJvd09uUGFnZScpO1xyXG4gICAgdGhpcy5sYkxhc3RSb3dPblBhZ2UgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2xhc3RSb3dPblBhZ2UnKTtcclxuICAgIHRoaXMuZVBhZ2VSb3dTdW1tYXJ5UGFuZWwgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI3BhZ2VSb3dTdW1tYXJ5UGFuZWwnKTtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy5idE5leHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0Lm9uQnROZXh0KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmJ0UHJldmlvdXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0Lm9uQnRQcmV2aW91cygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5idEZpcnN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5vbkJ0Rmlyc3QoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYnRMYXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5vbkJ0TGFzdCgpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2luYXRpb25Db250cm9sbGVyO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1hZy1wYWdpbmctcGFuZWw+PHNwYW4gaWQ9cGFnZVJvd1N1bW1hcnlQYW5lbCBjbGFzcz1hZy1wYWdpbmctcm93LXN1bW1hcnktcGFuZWw+PHNwYW4gaWQ9Zmlyc3RSb3dPblBhZ2U+PC9zcGFuPiBbVE9dIDxzcGFuIGlkPWxhc3RSb3dPblBhZ2U+PC9zcGFuPiBbT0ZdIDxzcGFuIGlkPXJlY29yZENvdW50Pjwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPWFnLXBhZ2luZy1wYWdlLXN1bW1hcnktcGFuZWw+PGJ1dHRvbiBjbGFzcz1hZy1wYWdpbmctYnV0dG9uIGlkPWJ0Rmlyc3Q+W0ZJUlNUXTwvYnV0dG9uPiA8YnV0dG9uIGNsYXNzPWFnLXBhZ2luZy1idXR0b24gaWQ9YnRQcmV2aW91cz5bUFJFVklPVVNdPC9idXR0b24+IFtQQUdFXSA8c3BhbiBpZD1jdXJyZW50Pjwvc3Bhbj4gW09GXSA8c3BhbiBpZD10b3RhbD48L3NwYW4+IDxidXR0b24gY2xhc3M9YWctcGFnaW5nLWJ1dHRvbiBpZD1idE5leHQ+W05FWFRdPC9idXR0b24+IDxidXR0b24gY2xhc3M9YWctcGFnaW5nLWJ1dHRvbiBpZD1idExhc3Q+W0xBU1RdPC9idXR0b24+PC9zcGFuPjwvZGl2PlwiO1xuIiwiLypcclxuICogVGhpcyByb3cgY29udHJvbGxlciBpcyB1c2VkIGZvciBpbmZpbml0ZSBzY3JvbGxpbmcgb25seS4gRm9yIG5vcm1hbCAnaW4gbWVtb3J5JyB0YWJsZSxcclxuICogb3Igc3RhbmRhcmQgcGFnaW5hdGlvbiwgdGhlIGluTWVtb3J5Um93Q29udHJvbGxlciBpcyB1c2VkLlxyXG4gKi9cclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG52YXIgbG9nZ2luZyA9IGZhbHNlO1xyXG5cclxuZnVuY3Rpb24gVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyKCkge31cclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKHJvd1JlbmRlcmVyLCBncmlkT3B0aW9uc1dyYXBwZXIsIGFuZ3VsYXJHcmlkKSB7XHJcbiAgICB0aGlzLnJvd1JlbmRlcmVyID0gcm93UmVuZGVyZXI7XHJcbiAgICB0aGlzLmRhdGFzb3VyY2VWZXJzaW9uID0gMDtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5zZXREYXRhc291cmNlID0gZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xyXG4gICAgdGhpcy5kYXRhc291cmNlID0gZGF0YXNvdXJjZTtcclxuXHJcbiAgICBpZiAoIWRhdGFzb3VyY2UpIHtcclxuICAgICAgICAvLyBvbmx5IGNvbnRpbnVlIGlmIHdlIGhhdmUgYSB2YWxpZCBkYXRhc291cmNlIHRvIHdvcmtpbmcgd2l0aFxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJlc2V0KCk7XHJcbn07XHJcblxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBzZWUgaWYgZGF0YXNvdXJjZSBrbm93cyBob3cgbWFueSByb3dzIHRoZXJlIGFyZVxyXG4gICAgaWYgKHR5cGVvZiB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQgPT09ICdudW1iZXInICYmIHRoaXMuZGF0YXNvdXJjZS5yb3dDb3VudCA+PSAwKSB7XHJcbiAgICAgICAgdGhpcy52aXJ0dWFsUm93Q291bnQgPSB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQ7XHJcbiAgICAgICAgdGhpcy5mb3VuZE1heFJvdyA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMudmlydHVhbFJvd0NvdW50ID0gMDtcclxuICAgICAgICB0aGlzLmZvdW5kTWF4Um93ID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaW4gY2FzZSBhbnkgZGFlbW9uIHJlcXVlc3RzIGNvbWluZyBmcm9tIGRhdGFzb3VyY2UsIHdlIGtub3cgaXQgaWdub3JlIHRoZW1cclxuICAgIHRoaXMuZGF0YXNvdXJjZVZlcnNpb24rKztcclxuXHJcbiAgICAvLyBtYXAgb2YgcGFnZSBudW1iZXJzIHRvIHJvd3MgaW4gdGhhdCBwYWdlXHJcbiAgICB0aGlzLnBhZ2VDYWNoZSA9IHt9O1xyXG4gICAgdGhpcy5wYWdlQ2FjaGVTaXplID0gMDtcclxuXHJcbiAgICAvLyBpZiBhIG51bWJlciBpcyBpbiB0aGlzIGFycmF5LCBpdCBtZWFucyB3ZSBhcmUgcGVuZGluZyBhIGxvYWQgZnJvbSBpdFxyXG4gICAgdGhpcy5wYWdlTG9hZHNJblByb2dyZXNzID0gW107XHJcbiAgICB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCA9IFtdO1xyXG4gICAgdGhpcy5wYWdlQWNjZXNzVGltZXMgPSB7fTsgLy8ga2VlcHMgYSByZWNvcmQgb2Ygd2hlbiBlYWNoIHBhZ2Ugd2FzIGxhc3Qgdmlld2VkLCB1c2VkIGZvciBMUlUgY2FjaGVcclxuICAgIHRoaXMuYWNjZXNzVGltZSA9IDA7IC8vIHJhdGhlciB0aGFuIHVzaW5nIHRoZSBjbG9jaywgd2UgdXNlIHRoaXMgY291bnRlclxyXG5cclxuICAgIC8vIHRoZSBudW1iZXIgb2YgY29uY3VycmVudCBsb2FkcyB3ZSBhcmUgYWxsb3dlZCB0byB0aGUgc2VydmVyXHJcbiAgICBpZiAodHlwZW9mIHRoaXMuZGF0YXNvdXJjZS5tYXhDb25jdXJyZW50UmVxdWVzdHMgPT09ICdudW1iZXInICYmIHRoaXMuZGF0YXNvdXJjZS5tYXhDb25jdXJyZW50UmVxdWVzdHMgPiAwKSB7XHJcbiAgICAgICAgdGhpcy5tYXhDb25jdXJyZW50RGF0YXNvdXJjZVJlcXVlc3RzID0gdGhpcy5kYXRhc291cmNlLm1heENvbmN1cnJlbnRSZXF1ZXN0cztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5tYXhDb25jdXJyZW50RGF0YXNvdXJjZVJlcXVlc3RzID0gMjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIHBhZ2VzIHRvIGtlZXAgaW4gYnJvd3NlciBjYWNoZVxyXG4gICAgaWYgKHR5cGVvZiB0aGlzLmRhdGFzb3VyY2UubWF4UGFnZXNJbkNhY2hlID09PSAnbnVtYmVyJyAmJiB0aGlzLmRhdGFzb3VyY2UubWF4UGFnZXNJbkNhY2hlID4gMCkge1xyXG4gICAgICAgIHRoaXMubWF4UGFnZXNJbkNhY2hlID0gdGhpcy5kYXRhc291cmNlLm1heFBhZ2VzSW5DYWNoZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gbnVsbCBpcyBkZWZhdWx0LCBtZWFucyBkb24ndCAgaGF2ZSBhbnkgbWF4IHNpemUgb24gdGhlIGNhY2hlXHJcbiAgICAgICAgdGhpcy5tYXhQYWdlc0luQ2FjaGUgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucGFnZVNpemUgPSB0aGlzLmRhdGFzb3VyY2UucGFnZVNpemU7IC8vIHRha2UgYSBjb3B5IG9mIHBhZ2Ugc2l6ZSwgd2UgZG9uJ3Qgd2FudCBpdCBjaGFuZ2luZ1xyXG4gICAgdGhpcy5vdmVyZmxvd1NpemUgPSB0aGlzLmRhdGFzb3VyY2Uub3ZlcmZsb3dTaXplOyAvLyB0YWtlIGEgY29weSBvZiBwYWdlIHNpemUsIHdlIGRvbid0IHdhbnQgaXQgY2hhbmdpbmdcclxuXHJcbiAgICB0aGlzLmRvTG9hZE9yUXVldWUoMCk7XHJcbn07XHJcblxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmNyZWF0ZU5vZGVzRnJvbVJvd3MgPSBmdW5jdGlvbihwYWdlTnVtYmVyLCByb3dzKSB7XHJcbiAgICB2YXIgbm9kZXMgPSBbXTtcclxuICAgIGlmIChyb3dzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGogPSByb3dzLmxlbmd0aDsgaSA8IGo7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgdmlydHVhbFJvd0luZGV4ID0gKHBhZ2VOdW1iZXIgKiB0aGlzLnBhZ2VTaXplKSArIGk7XHJcbiAgICAgICAgICAgIG5vZGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgZGF0YTogcm93c1tpXSxcclxuICAgICAgICAgICAgICAgIGlkOiB2aXJ0dWFsUm93SW5kZXhcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vZGVzO1xyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVGcm9tTG9hZGluZyA9IGZ1bmN0aW9uKHBhZ2VOdW1iZXIpIHtcclxuICAgIHZhciBpbmRleCA9IHRoaXMucGFnZUxvYWRzSW5Qcm9ncmVzcy5pbmRleE9mKHBhZ2VOdW1iZXIpO1xyXG4gICAgdGhpcy5wYWdlTG9hZHNJblByb2dyZXNzLnNwbGljZShpbmRleCwgMSk7XHJcbn07XHJcblxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnBhZ2VMb2FkRmFpbGVkID0gZnVuY3Rpb24ocGFnZU51bWJlcikge1xyXG4gICAgdGhpcy5yZW1vdmVGcm9tTG9hZGluZyhwYWdlTnVtYmVyKTtcclxuICAgIHRoaXMuY2hlY2tRdWV1ZUZvck5leHRMb2FkKCk7XHJcbn07XHJcblxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnBhZ2VMb2FkZWQgPSBmdW5jdGlvbihwYWdlTnVtYmVyLCByb3dzLCBsYXN0Um93KSB7XHJcbiAgICB0aGlzLnB1dFBhZ2VJbnRvQ2FjaGVBbmRQdXJnZShwYWdlTnVtYmVyLCByb3dzKTtcclxuICAgIHRoaXMuY2hlY2tNYXhSb3dBbmRJbmZvcm1Sb3dSZW5kZXJlcihwYWdlTnVtYmVyLCBsYXN0Um93KTtcclxuICAgIHRoaXMucmVtb3ZlRnJvbUxvYWRpbmcocGFnZU51bWJlcik7XHJcbiAgICB0aGlzLmNoZWNrUXVldWVGb3JOZXh0TG9hZCgpO1xyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5wdXRQYWdlSW50b0NhY2hlQW5kUHVyZ2UgPSBmdW5jdGlvbihwYWdlTnVtYmVyLCByb3dzKSB7XHJcbiAgICB0aGlzLnBhZ2VDYWNoZVtwYWdlTnVtYmVyXSA9IHRoaXMuY3JlYXRlTm9kZXNGcm9tUm93cyhwYWdlTnVtYmVyLCByb3dzKTtcclxuICAgIHRoaXMucGFnZUNhY2hlU2l6ZSsrO1xyXG4gICAgaWYgKGxvZ2dpbmcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nIHBhZ2UgJyArIHBhZ2VOdW1iZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBuZWVkVG9QdXJnZSA9IHRoaXMubWF4UGFnZXNJbkNhY2hlICYmIHRoaXMubWF4UGFnZXNJbkNhY2hlIDwgdGhpcy5wYWdlQ2FjaGVTaXplO1xyXG4gICAgaWYgKG5lZWRUb1B1cmdlKSB7XHJcbiAgICAgICAgLy8gZmluZCB0aGUgTFJVIHBhZ2VcclxuICAgICAgICB2YXIgeW91bmdlc3RQYWdlSW5kZXggPSB0aGlzLmZpbmRMZWFzdFJlY2VudGx5QWNjZXNzZWRQYWdlKE9iamVjdC5rZXlzKHRoaXMucGFnZUNhY2hlKSk7XHJcblxyXG4gICAgICAgIGlmIChsb2dnaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXJnaW5nIHBhZ2UgJyArIHlvdW5nZXN0UGFnZUluZGV4ICsgJyBmcm9tIGNhY2hlICcgKyBPYmplY3Qua2V5cyh0aGlzLnBhZ2VDYWNoZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgdGhpcy5wYWdlQ2FjaGVbeW91bmdlc3RQYWdlSW5kZXhdO1xyXG4gICAgICAgIHRoaXMucGFnZUNhY2hlU2l6ZS0tO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuY2hlY2tNYXhSb3dBbmRJbmZvcm1Sb3dSZW5kZXJlciA9IGZ1bmN0aW9uKHBhZ2VOdW1iZXIsIGxhc3RSb3cpIHtcclxuICAgIGlmICghdGhpcy5mb3VuZE1heFJvdykge1xyXG4gICAgICAgIC8vIGlmIHdlIGtub3cgdGhlIGxhc3Qgcm93LCB1c2UgaWZcclxuICAgICAgICBpZiAodHlwZW9mIGxhc3RSb3cgPT09ICdudW1iZXInICYmIGxhc3RSb3cgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnZpcnR1YWxSb3dDb3VudCA9IGxhc3RSb3c7XHJcbiAgICAgICAgICAgIHRoaXMuZm91bmRNYXhSb3cgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgc2VlIGlmIHdlIG5lZWQgdG8gYWRkIHNvbWUgdmlydHVhbCByb3dzXHJcbiAgICAgICAgICAgIHZhciB0aGlzUGFnZVBsdXNCdWZmZXIgPSAoKHBhZ2VOdW1iZXIgKyAxKSAqIHRoaXMucGFnZVNpemUpICsgdGhpcy5vdmVyZmxvd1NpemU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnZpcnR1YWxSb3dDb3VudCA8IHRoaXNQYWdlUGx1c0J1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy52aXJ0dWFsUm93Q291bnQgPSB0aGlzUGFnZVBsdXNCdWZmZXI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gaWYgcm93Q291bnQgY2hhbmdlcywgcmVmcmVzaFZpZXcsIG90aGVyd2lzZSBqdXN0IHJlZnJlc2hBbGxWaXJ0dWFsUm93c1xyXG4gICAgICAgIHRoaXMucm93UmVuZGVyZXIucmVmcmVzaFZpZXcoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5yb3dSZW5kZXJlci5yZWZyZXNoQWxsVmlydHVhbFJvd3MoKTtcclxuICAgIH1cclxufTtcclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuaXNQYWdlQWxyZWFkeUxvYWRpbmcgPSBmdW5jdGlvbihwYWdlTnVtYmVyKSB7XHJcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy5wYWdlTG9hZHNJblByb2dyZXNzLmluZGV4T2YocGFnZU51bWJlcikgPj0gMCB8fCB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZC5pbmRleE9mKHBhZ2VOdW1iZXIpID49IDA7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb0xvYWRPclF1ZXVlID0gZnVuY3Rpb24ocGFnZU51bWJlcikge1xyXG4gICAgLy8gaWYgd2UgYWxyZWFkeSB0cmllZCB0byBsb2FkIHRoaXMgcGFnZSwgdGhlbiBpZ25vcmUgdGhlIHJlcXVlc3QsXHJcbiAgICAvLyBvdGhlcndpc2Ugc2VydmVyIHdvdWxkIGJlIGhpdCA1MCB0aW1lcyBqdXN0IHRvIGRpc3BsYXkgb25lIHBhZ2UsIHRoZVxyXG4gICAgLy8gZmlyc3Qgcm93IHRvIGZpbmQgdGhlIHBhZ2UgbWlzc2luZyBpcyBlbm91Z2guXHJcbiAgICBpZiAodGhpcy5pc1BhZ2VBbHJlYWR5TG9hZGluZyhwYWdlTnVtYmVyKSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0cnkgdGhlIHBhZ2UgbG9hZCAtIGlmIG5vdCBhbHJlYWR5IGRvaW5nIGEgbG9hZCwgdGhlbiB3ZSBjYW4gZ28gYWhlYWRcclxuICAgIGlmICh0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MubGVuZ3RoIDwgdGhpcy5tYXhDb25jdXJyZW50RGF0YXNvdXJjZVJlcXVlc3RzKSB7XHJcbiAgICAgICAgLy8gZ28gYWhlYWQsIGxvYWQgdGhlIHBhZ2VcclxuICAgICAgICB0aGlzLmxvYWRQYWdlKHBhZ2VOdW1iZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBvdGhlcndpc2UsIHF1ZXVlIHRoZSByZXF1ZXN0XHJcbiAgICAgICAgdGhpcy5hZGRUb1F1ZXVlQW5kUHVyZ2VRdWV1ZShwYWdlTnVtYmVyKTtcclxuICAgIH1cclxufTtcclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuYWRkVG9RdWV1ZUFuZFB1cmdlUXVldWUgPSBmdW5jdGlvbihwYWdlTnVtYmVyKSB7XHJcbiAgICBpZiAobG9nZ2luZykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdxdWV1ZWluZyAnICsgcGFnZU51bWJlciArICcgLSAnICsgdGhpcy5wYWdlTG9hZHNRdWV1ZWQpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5wYWdlTG9hZHNRdWV1ZWQucHVzaChwYWdlTnVtYmVyKTtcclxuXHJcbiAgICAvLyBzZWUgaWYgdGhlcmUgYXJlIG1vcmUgcGFnZXMgcXVldWVkIHRoYXQgYXJlIGFjdHVhbGx5IGluIG91ciBjYWNoZSwgaWYgc28gdGhlcmUgaXNcclxuICAgIC8vIG5vIHBvaW50IGluIGxvYWRpbmcgdGhlbSBhbGwgYXMgc29tZSB3aWxsIGJlIHB1cmdlZCBhcyBzb29uIGFzIGxvYWRlZFxyXG4gICAgdmFyIG5lZWRUb1B1cmdlID0gdGhpcy5tYXhQYWdlc0luQ2FjaGUgJiYgdGhpcy5tYXhQYWdlc0luQ2FjaGUgPCB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZC5sZW5ndGg7XHJcbiAgICBpZiAobmVlZFRvUHVyZ2UpIHtcclxuICAgICAgICAvLyBmaW5kIHRoZSBMUlUgcGFnZVxyXG4gICAgICAgIHZhciB5b3VuZ2VzdFBhZ2VJbmRleCA9IHRoaXMuZmluZExlYXN0UmVjZW50bHlBY2Nlc3NlZFBhZ2UodGhpcy5wYWdlTG9hZHNRdWV1ZWQpO1xyXG5cclxuICAgICAgICBpZiAobG9nZ2luZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGUtcXVldWVpbmcgJyArIHBhZ2VOdW1iZXIgKyAnIC0gJyArIHRoaXMucGFnZUxvYWRzUXVldWVkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBpbmRleFRvUmVtb3ZlID0gdGhpcy5wYWdlTG9hZHNRdWV1ZWQuaW5kZXhPZih5b3VuZ2VzdFBhZ2VJbmRleCk7XHJcbiAgICAgICAgdGhpcy5wYWdlTG9hZHNRdWV1ZWQuc3BsaWNlKGluZGV4VG9SZW1vdmUsIDEpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5maW5kTGVhc3RSZWNlbnRseUFjY2Vzc2VkUGFnZSA9IGZ1bmN0aW9uKHBhZ2VJbmRleGVzKSB7XHJcbiAgICB2YXIgeW91bmdlc3RQYWdlSW5kZXggPSAtMTtcclxuICAgIHZhciB5b3VuZ2VzdFBhZ2VBY2Nlc3NUaW1lID0gTnVtYmVyLk1BWF9WQUxVRTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICBwYWdlSW5kZXhlcy5mb3JFYWNoKGZ1bmN0aW9uKHBhZ2VJbmRleCkge1xyXG4gICAgICAgIHZhciBhY2Nlc3NUaW1lVGhpc1BhZ2UgPSB0aGF0LnBhZ2VBY2Nlc3NUaW1lc1twYWdlSW5kZXhdO1xyXG4gICAgICAgIGlmIChhY2Nlc3NUaW1lVGhpc1BhZ2UgPCB5b3VuZ2VzdFBhZ2VBY2Nlc3NUaW1lKSB7XHJcbiAgICAgICAgICAgIHlvdW5nZXN0UGFnZUFjY2Vzc1RpbWUgPSBhY2Nlc3NUaW1lVGhpc1BhZ2U7XHJcbiAgICAgICAgICAgIHlvdW5nZXN0UGFnZUluZGV4ID0gcGFnZUluZGV4O1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB5b3VuZ2VzdFBhZ2VJbmRleDtcclxufTtcclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuY2hlY2tRdWV1ZUZvck5leHRMb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5wYWdlTG9hZHNRdWV1ZWQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIC8vIHRha2UgZnJvbSB0aGUgZnJvbnQgb2YgdGhlIHF1ZXVlXHJcbiAgICAgICAgdmFyIHBhZ2VUb0xvYWQgPSB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZFswXTtcclxuICAgICAgICB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZC5zcGxpY2UoMCwgMSk7XHJcblxyXG4gICAgICAgIGlmIChsb2dnaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkZXF1ZXVlaW5nICcgKyBwYWdlVG9Mb2FkICsgJyAtICcgKyB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvYWRQYWdlKHBhZ2VUb0xvYWQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5sb2FkUGFnZSA9IGZ1bmN0aW9uKHBhZ2VOdW1iZXIpIHtcclxuXHJcbiAgICB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MucHVzaChwYWdlTnVtYmVyKTtcclxuXHJcbiAgICB2YXIgc3RhcnRSb3cgPSBwYWdlTnVtYmVyICogdGhpcy5wYWdlU2l6ZTtcclxuICAgIHZhciBlbmRSb3cgPSAocGFnZU51bWJlciArIDEpICogdGhpcy5wYWdlU2l6ZTtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgZGF0YXNvdXJjZVZlcnNpb25Db3B5ID0gdGhpcy5kYXRhc291cmNlVmVyc2lvbjtcclxuXHJcbiAgICB2YXIgc29ydE1vZGVsO1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xyXG4gICAgICAgIHNvcnRNb2RlbCA9IHRoaXMuYW5ndWxhckdyaWQuZ2V0U29ydE1vZGVsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZpbHRlck1vZGVsO1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZUZpbHRlcigpKSB7XHJcbiAgICAgICAgZmlsdGVyTW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldEZpbHRlck1vZGVsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICBzdGFydFJvdzogc3RhcnRSb3csXHJcbiAgICAgICAgZW5kUm93OiBlbmRSb3csXHJcbiAgICAgICAgc3VjY2Vzc0NhbGxiYWNrOiBzdWNjZXNzQ2FsbGJhY2ssXHJcbiAgICAgICAgZmFpbENhbGxiYWNrOiBmYWlsQ2FsbGJhY2ssXHJcbiAgICAgICAgc29ydE1vZGVsOiBzb3J0TW9kZWwsXHJcbiAgICAgICAgZmlsdGVyTW9kZWw6IGZpbHRlck1vZGVsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIGNoZWNrIGlmIG9sZCB2ZXJzaW9uIG9mIGRhdGFzb3VyY2UgdXNlZFxyXG4gICAgdmFyIGdldFJvd3NQYXJhbXMgPSB1dGlscy5nZXRGdW5jdGlvblBhcmFtZXRlcnModGhpcy5kYXRhc291cmNlLmdldFJvd3MpO1xyXG4gICAgaWYgKGdldFJvd3NQYXJhbXMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogSXQgbG9va3MgbGlrZSB5b3VyIHBhZ2luZyBkYXRhc291cmNlIGlzIG9mIHRoZSBvbGQgdHlwZSwgdGFraW5nIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyLicpO1xyXG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogRnJvbSBhZy1ncmlkIDEuOS4wLCBub3cgdGhlIGdldFJvd3MgdGFrZXMgb25lIHBhcmFtZXRlci4gU2VlIHRoZSBkb2N1bWVudGF0aW9uIGZvciBkZXRhaWxzLicpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZGF0YXNvdXJjZS5nZXRSb3dzKHBhcmFtcyk7XHJcblxyXG4gICAgZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKHJvd3MsIGxhc3RSb3dJbmRleCkge1xyXG4gICAgICAgIGlmICh0aGF0LnJlcXVlc3RJc0RhZW1vbihkYXRhc291cmNlVmVyc2lvbkNvcHkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhhdC5wYWdlTG9hZGVkKHBhZ2VOdW1iZXIsIHJvd3MsIGxhc3RSb3dJbmRleCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmFpbENhbGxiYWNrKCkge1xyXG4gICAgICAgIGlmICh0aGF0LnJlcXVlc3RJc0RhZW1vbihkYXRhc291cmNlVmVyc2lvbkNvcHkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhhdC5wYWdlTG9hZEZhaWxlZChwYWdlTnVtYmVyKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIGNoZWNrIHRoYXQgdGhlIGRhdGFzb3VyY2UgaGFzIG5vdCBjaGFuZ2VkIHNpbmNlIHRoZSBsYXRzIHRpbWUgd2UgZGlkIGEgcmVxdWVzdFxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnJlcXVlc3RJc0RhZW1vbiA9IGZ1bmN0aW9uKGRhdGFzb3VyY2VWZXJzaW9uQ29weSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGF0YXNvdXJjZVZlcnNpb24gIT09IGRhdGFzb3VyY2VWZXJzaW9uQ29weTtcclxufTtcclxuXHJcblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuZ2V0VmlydHVhbFJvdyA9IGZ1bmN0aW9uKHJvd0luZGV4KSB7XHJcbiAgICBpZiAocm93SW5kZXggPiB0aGlzLnZpcnR1YWxSb3dDb3VudCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwYWdlTnVtYmVyID0gTWF0aC5mbG9vcihyb3dJbmRleCAvIHRoaXMucGFnZVNpemUpO1xyXG4gICAgdmFyIHBhZ2UgPSB0aGlzLnBhZ2VDYWNoZVtwYWdlTnVtYmVyXTtcclxuXHJcbiAgICAvLyBmb3IgTFJVIGNhY2hlLCB0cmFjayB3aGVuIHRoaXMgcGFnZSB3YXMgbGFzdCBoaXRcclxuICAgIHRoaXMucGFnZUFjY2Vzc1RpbWVzW3BhZ2VOdW1iZXJdID0gdGhpcy5hY2Nlc3NUaW1lKys7XHJcblxyXG4gICAgaWYgKCFwYWdlKSB7XHJcbiAgICAgICAgdGhpcy5kb0xvYWRPclF1ZXVlKHBhZ2VOdW1iZXIpO1xyXG4gICAgICAgIC8vIHJldHVybiBiYWNrIGFuIGVtcHR5IHJvdywgc28gdGFibGUgY2FuIGF0IGxlYXN0IHJlbmRlciBlbXB0eSBjZWxsc1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGRhdGE6IHt9LFxyXG4gICAgICAgICAgICBpZDogcm93SW5kZXhcclxuICAgICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgaW5kZXhJblRoaXNQYWdlID0gcm93SW5kZXggJSB0aGlzLnBhZ2VTaXplO1xyXG4gICAgICAgIHJldHVybiBwYWdlW2luZGV4SW5UaGlzUGFnZV07XHJcbiAgICB9XHJcbn07XHJcblxyXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmZvckVhY2hJbk1lbW9yeSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcGFnZUtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhZ2VDYWNoZSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaTxwYWdlS2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBwYWdlS2V5ID0gcGFnZUtleXNbaV07XHJcbiAgICAgICAgdmFyIHBhZ2UgPSB0aGlzLnBhZ2VDYWNoZVtwYWdlS2V5XTtcclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgajxwYWdlLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIHZhciBub2RlID0gcGFnZVtqXTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobm9kZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBnZXRWaXJ0dWFsUm93OiBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhhdC5nZXRWaXJ0dWFsUm93KGluZGV4KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFZpcnR1YWxSb3dDb3VudDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnZpcnR1YWxSb3dDb3VudDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvckVhY2hJbk1lbW9yeTogZnVuY3Rpb24oIGNhbGxiYWNrICkge1xyXG4gICAgICAgICAgICB0aGF0LmZvckVhY2hJbk1lbW9yeShjYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyO1xyXG4iLCJ2YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgZ3JvdXBDZWxsUmVuZGVyZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9jZWxsUmVuZGVyZXJzL2dyb3VwQ2VsbFJlbmRlcmVyRmFjdG9yeScpO1xyXG5cclxuZnVuY3Rpb24gUm93UmVuZGVyZXIoKSB7fVxyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihncmlkT3B0aW9ucywgY29sdW1uTW9kZWwsIGdyaWRPcHRpb25zV3JhcHBlciwgZ3JpZFBhbmVsLFxyXG4gICAgYW5ndWxhckdyaWQsIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSwgJGNvbXBpbGUsICRzY29wZSxcclxuICAgIHNlbGVjdGlvbkNvbnRyb2xsZXIsIGV4cHJlc3Npb25TZXJ2aWNlLCB0ZW1wbGF0ZVNlcnZpY2UpIHtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnMgPSBncmlkT3B0aW9ucztcclxuICAgIHRoaXMuY29sdW1uTW9kZWwgPSBjb2x1bW5Nb2RlbDtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xyXG4gICAgdGhpcy5zZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkgPSBzZWxlY3Rpb25SZW5kZXJlckZhY3Rvcnk7XHJcbiAgICB0aGlzLmdyaWRQYW5lbCA9IGdyaWRQYW5lbDtcclxuICAgIHRoaXMuJGNvbXBpbGUgPSAkY29tcGlsZTtcclxuICAgIHRoaXMuJHNjb3BlID0gJHNjb3BlO1xyXG4gICAgdGhpcy5zZWxlY3Rpb25Db250cm9sbGVyID0gc2VsZWN0aW9uQ29udHJvbGxlcjtcclxuICAgIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UgPSBleHByZXNzaW9uU2VydmljZTtcclxuICAgIHRoaXMudGVtcGxhdGVTZXJ2aWNlID0gdGVtcGxhdGVTZXJ2aWNlO1xyXG4gICAgdGhpcy5maW5kQWxsRWxlbWVudHMoZ3JpZFBhbmVsKTtcclxuXHJcbiAgICB0aGlzLmNlbGxSZW5kZXJlck1hcCA9IHtcclxuICAgICAgICAnZ3JvdXAnOiBncm91cENlbGxSZW5kZXJlckZhY3RvcnkoZ3JpZE9wdGlvbnNXcmFwcGVyLCBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkpLFxyXG4gICAgICAgICdleHBhbmQnOiBncmlkT3B0aW9ucy5leHBhbmRSb3dcclxuICAgIH07XHJcblxyXG4gICAgLy8gbWFwIG9mIHJvdyBpZHMgdG8gcm93IG9iamVjdHMuIGtlZXBzIHRyYWNrIG9mIHdoaWNoIGVsZW1lbnRzXHJcbiAgICAvLyBhcmUgcmVuZGVyZWQgZm9yIHdoaWNoIHJvd3MgaW4gdGhlIGRvbS4gZWFjaCByb3cgb2JqZWN0IGhhczpcclxuICAgIC8vIFtzY29wZSwgYm9keVJvdywgcGlubmVkUm93LCByb3dEYXRhXVxyXG4gICAgdGhpcy5yZW5kZXJlZFJvd3MgPSB7fTtcclxuXHJcbiAgICB0aGlzLnJlbmRlcmVkUm93U3RhcnRFZGl0aW5nTGlzdGVuZXJzID0ge307XHJcblxyXG4gICAgdGhpcy5lZGl0aW5nQ2VsbCA9IGZhbHNlOyAvL2dldHMgc2V0IHRvIHRydWUgd2hlbiBlZGl0aW5nIGEgY2VsbFxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnNldFJvd01vZGVsID0gZnVuY3Rpb24ocm93TW9kZWwpIHtcclxuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zZXRNYWluUm93V2lkdGhzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgbWFpblJvd1dpZHRoID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRCb2R5Q29udGFpbmVyV2lkdGgoKSArIFwicHhcIjtcclxuXHJcbiAgICB2YXIgdW5waW5uZWRSb3dzID0gdGhpcy5lQm9keUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiLmFnLXJvd1wiKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdW5waW5uZWRSb3dzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdW5waW5uZWRSb3dzW2ldLnN0eWxlLndpZHRoID0gbWFpblJvd1dpZHRoO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmZpbmRBbGxFbGVtZW50cyA9IGZ1bmN0aW9uKGdyaWRQYW5lbCkge1xyXG4gICAgdGhpcy5lQm9keUNvbnRhaW5lciA9IGdyaWRQYW5lbC5nZXRCb2R5Q29udGFpbmVyKCk7XHJcbiAgICB0aGlzLmVCb2R5Vmlld3BvcnQgPSBncmlkUGFuZWwuZ2V0Qm9keVZpZXdwb3J0KCk7XHJcbiAgICB0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyID0gZ3JpZFBhbmVsLmdldFBpbm5lZENvbHNDb250YWluZXIoKTtcclxuICAgIHRoaXMuZVBhcmVudE9mUm93cyA9IGdyaWRQYW5lbC5nZXRSb3dzUGFyZW50KCk7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVmcmVzaFZpZXcgPSBmdW5jdGlvbihyZWZyZXNoRnJvbUluZGV4KSB7XHJcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKSkge1xyXG4gICAgICAgIHZhciByb3dDb3VudCA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvd0NvdW50KCk7XHJcbiAgICAgICAgdmFyIGNvbnRhaW5lckhlaWdodCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpICogcm93Q291bnQ7XHJcbiAgICAgICAgdGhpcy5lQm9keUNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQgKyBcInB4XCI7XHJcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBjb250YWluZXJIZWlnaHQgKyBcInB4XCI7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5yZWZyZXNoQWxsVmlydHVhbFJvd3MocmVmcmVzaEZyb21JbmRleCk7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc29mdFJlZnJlc2hWaWV3ID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdmFyIGZpcnN0ID0gdGhpcy5maXJzdFZpcnR1YWxSZW5kZXJlZFJvdztcclxuICAgIHZhciBsYXN0ID0gdGhpcy5sYXN0VmlydHVhbFJlbmRlcmVkUm93O1xyXG5cclxuICAgIHZhciBjb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKCk7XHJcbiAgICAvLyBpZiBubyBjb2xzLCBkb24ndCBkcmF3IHJvd1xyXG4gICAgaWYgKCFjb2x1bW5zIHx8IGNvbHVtbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIHJvd0luZGV4ID0gZmlyc3Q7IHJvd0luZGV4IDw9IGxhc3Q7IHJvd0luZGV4KyspIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvdyhyb3dJbmRleCk7XHJcbiAgICAgICAgaWYgKG5vZGUpIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGNvbEluZGV4ID0gMDsgY29sSW5kZXggPCBjb2x1bW5zLmxlbmd0aDsgY29sSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbY29sSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVkUm93ID0gdGhpcy5yZW5kZXJlZFJvd3Nbcm93SW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGVHcmlkQ2VsbCA9IHJlbmRlcmVkUm93LmVWb2xhdGlsZUNlbGxzW2NvbHVtbi5jb2xJZF07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFlR3JpZENlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgaXNGaXJzdENvbHVtbiA9IGNvbEluZGV4ID09PSAwO1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gcmVuZGVyZWRSb3cuc2NvcGU7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zb2Z0UmVmcmVzaENlbGwoZUdyaWRDZWxsLCBpc0ZpcnN0Q29sdW1uLCBub2RlLCBjb2x1bW4sIHNjb3BlLCByb3dJbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc29mdFJlZnJlc2hDZWxsID0gZnVuY3Rpb24oZUdyaWRDZWxsLCBpc0ZpcnN0Q29sdW1uLCBub2RlLCBjb2x1bW4sIHNjb3BlLCByb3dJbmRleCkge1xyXG5cclxuICAgIHV0aWxzLnJlbW92ZUFsbENoaWxkcmVuKGVHcmlkQ2VsbCk7XHJcblxyXG4gICAgdmFyIGRhdGEgPSB0aGlzLmdldERhdGFGb3JOb2RlKG5vZGUpO1xyXG4gICAgdmFyIHZhbHVlR2V0dGVyID0gdGhpcy5jcmVhdGVWYWx1ZUdldHRlcihkYXRhLCBjb2x1bW4uY29sRGVmLCBub2RlKTtcclxuXHJcbiAgICB2YXIgdmFsdWU7XHJcbiAgICBpZiAodmFsdWVHZXR0ZXIpIHtcclxuICAgICAgICB2YWx1ZSA9IHZhbHVlR2V0dGVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wb3B1bGF0ZUFuZFN0eWxlR3JpZENlbGwodmFsdWVHZXR0ZXIsIHZhbHVlLCBlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsIHNjb3BlKTtcclxuXHJcbiAgICAvLyBpZiBhbmd1bGFyIGNvbXBpbGluZywgdGhlbiBuZWVkIHRvIGFsc28gY29tcGlsZSB0aGUgY2VsbCBhZ2FpbiAoYW5ndWxhciBjb21waWxpbmcgc3Vja3MsIHBsZWFzZSB3YWl0Li4uKVxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzQW5ndWxhckNvbXBpbGVSb3dzKCkpIHtcclxuICAgICAgICB0aGlzLiRjb21waWxlKGVHcmlkQ2VsbCkoc2NvcGUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnJvd0RhdGFDaGFuZ2VkID0gZnVuY3Rpb24ocm93cykge1xyXG4gICAgLy8gd2Ugb25seSBuZWVkIHRvIGJlIHdvcnJpZWQgYWJvdXQgcmVuZGVyZWQgcm93cywgYXMgdGhpcyBtZXRob2QgaXNcclxuICAgIC8vIGNhbGxlZCB0byB3aGF0cyByZW5kZXJlZC4gaWYgdGhlIHJvdyBpc24ndCByZW5kZXJlZCwgd2UgZG9uJ3QgY2FyZVxyXG4gICAgdmFyIGluZGV4ZXNUb1JlbW92ZSA9IFtdO1xyXG4gICAgdmFyIHJlbmRlcmVkUm93cyA9IHRoaXMucmVuZGVyZWRSb3dzO1xyXG4gICAgT2JqZWN0LmtleXMocmVuZGVyZWRSb3dzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgIHZhciByZW5kZXJlZFJvdyA9IHJlbmRlcmVkUm93c1trZXldO1xyXG4gICAgICAgIC8vIHNlZSBpZiB0aGUgcmVuZGVyZWQgcm93IGlzIGluIHRoZSBsaXN0IG9mIHJvd3Mgd2UgaGF2ZSB0byB1cGRhdGVcclxuICAgICAgICB2YXIgcm93TmVlZHNVcGRhdGluZyA9IHJvd3MuaW5kZXhPZihyZW5kZXJlZFJvdy5ub2RlLmRhdGEpID49IDA7XHJcbiAgICAgICAgaWYgKHJvd05lZWRzVXBkYXRpbmcpIHtcclxuICAgICAgICAgICAgaW5kZXhlc1RvUmVtb3ZlLnB1c2goa2V5KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8vIHJlbW92ZSB0aGUgcm93c1xyXG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhpbmRleGVzVG9SZW1vdmUpO1xyXG4gICAgLy8gYWRkIGRyYXcgdGhlbSBhZ2FpblxyXG4gICAgdGhpcy5kcmF3VmlydHVhbFJvd3MoKTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZWZyZXNoQWxsVmlydHVhbFJvd3MgPSBmdW5jdGlvbihmcm9tSW5kZXgpIHtcclxuICAgIC8vIHJlbW92ZSBhbGwgY3VycmVudCB2aXJ0dWFsIHJvd3MsIGFzIHRoZXkgaGF2ZSBvbGQgZGF0YVxyXG4gICAgdmFyIHJvd3NUb1JlbW92ZSA9IE9iamVjdC5rZXlzKHRoaXMucmVuZGVyZWRSb3dzKTtcclxuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlLCBmcm9tSW5kZXgpO1xyXG5cclxuICAgIC8vIGFkZCBpbiBuZXcgcm93c1xyXG4gICAgdGhpcy5kcmF3VmlydHVhbFJvd3MoKTtcclxufTtcclxuXHJcbi8vIHB1YmxpYyAtIHJlbW92ZXMgdGhlIGdyb3VwIHJvd3MgYW5kIHRoZW4gcmVkcmF3cyB0aGVtIGFnYWluXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZWZyZXNoR3JvdXBSb3dzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBmaW5kIGFsbCB0aGUgZ3JvdXAgcm93c1xyXG4gICAgdmFyIHJvd3NUb1JlbW92ZSA9IFtdO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgT2JqZWN0LmtleXModGhpcy5yZW5kZXJlZFJvd3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVkUm93ID0gdGhhdC5yZW5kZXJlZFJvd3Nba2V5XTtcclxuICAgICAgICB2YXIgbm9kZSA9IHJlbmRlcmVkUm93Lm5vZGU7XHJcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICAgICAgcm93c1RvUmVtb3ZlLnB1c2goa2V5KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8vIHJlbW92ZSB0aGUgcm93c1xyXG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhyb3dzVG9SZW1vdmUpO1xyXG4gICAgLy8gYW5kIGRyYXcgdGhlbSBiYWNrIGFnYWluXHJcbiAgICB0aGlzLmVuc3VyZVJvd3NSZW5kZXJlZCgpO1xyXG59O1xyXG5cclxuLy8gdGFrZXMgYXJyYXkgb2Ygcm93IGluZGV4ZXNcclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZVZpcnR1YWxSb3dzID0gZnVuY3Rpb24ocm93c1RvUmVtb3ZlLCBmcm9tSW5kZXgpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIC8vIGlmIG5vIGZyb21JbmRleCB0aGVuIHNldCB0byAtMSwgd2hpY2ggd2lsbCByZWZyZXNoIGV2ZXJ5dGhpbmdcclxuICAgIHZhciByZWFsRnJvbUluZGV4ID0gKHR5cGVvZiBmcm9tSW5kZXggPT09ICdudW1iZXInKSA/IGZyb21JbmRleCA6IC0xO1xyXG4gICAgcm93c1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24oaW5kZXhUb1JlbW92ZSkge1xyXG4gICAgICAgIGlmIChpbmRleFRvUmVtb3ZlID49IHJlYWxGcm9tSW5kZXgpIHtcclxuICAgICAgICAgICAgdGhhdC5yZW1vdmVWaXJ0dWFsUm93KGluZGV4VG9SZW1vdmUpO1xyXG5cclxuICAgICAgICAgICAgLy8gaWYgdGhlIHJvdyB3YXMgbGFzdCB0byBoYXZlIGZvY3VzLCB3ZSByZW1vdmUgdGhlIGZhY3QgdGhhdCBpdCBoYXMgZm9jdXNcclxuICAgICAgICAgICAgaWYgKHRoYXQuZm9jdXNlZENlbGwgJiYgdGhhdC5mb2N1c2VkQ2VsbC5yb3dJbmRleCA9PSBpbmRleFRvUmVtb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmZvY3VzZWRDZWxsID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZVZpcnR1YWxSb3cgPSBmdW5jdGlvbihpbmRleFRvUmVtb3ZlKSB7XHJcbiAgICB2YXIgcmVuZGVyZWRSb3cgPSB0aGlzLnJlbmRlcmVkUm93c1tpbmRleFRvUmVtb3ZlXTtcclxuICAgIGlmIChyZW5kZXJlZFJvdy5waW5uZWRFbGVtZW50ICYmIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIpIHtcclxuICAgICAgICB0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyLnJlbW92ZUNoaWxkKHJlbmRlcmVkUm93LnBpbm5lZEVsZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZW5kZXJlZFJvdy5ib2R5RWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuZUJvZHlDb250YWluZXIucmVtb3ZlQ2hpbGQocmVuZGVyZWRSb3cuYm9keUVsZW1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZW5kZXJlZFJvdy5zY29wZSkge1xyXG4gICAgICAgIHJlbmRlcmVkUm93LnNjb3BlLiRkZXN0cm95KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFZpcnR1YWxSb3dSZW1vdmVkKCkpIHtcclxuICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRWaXJ0dWFsUm93UmVtb3ZlZCgpKHJlbmRlcmVkUm93LmRhdGEsIGluZGV4VG9SZW1vdmUpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5vblZpcnR1YWxSb3dSZW1vdmVkKGluZGV4VG9SZW1vdmUpO1xyXG5cclxuICAgIGRlbGV0ZSB0aGlzLnJlbmRlcmVkUm93c1tpbmRleFRvUmVtb3ZlXTtcclxuICAgIGRlbGV0ZSB0aGlzLnJlbmRlcmVkUm93U3RhcnRFZGl0aW5nTGlzdGVuZXJzW2luZGV4VG9SZW1vdmVdO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmRyYXdWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGZpcnN0O1xyXG4gICAgdmFyIGxhc3Q7XHJcblxyXG4gICAgdmFyIHJvd0NvdW50ID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93Q291bnQoKTtcclxuXHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNEb250VXNlU2Nyb2xscygpKSB7XHJcbiAgICAgICAgZmlyc3QgPSAwO1xyXG4gICAgICAgIGxhc3QgPSByb3dDb3VudDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIHRvcFBpeGVsID0gdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbFRvcDtcclxuICAgICAgICB2YXIgYm90dG9tUGl4ZWwgPSB0b3BQaXhlbCArIHRoaXMuZUJvZHlWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XHJcblxyXG4gICAgICAgIGZpcnN0ID0gTWF0aC5mbG9vcih0b3BQaXhlbCAvIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpKTtcclxuICAgICAgICBsYXN0ID0gTWF0aC5mbG9vcihib3R0b21QaXhlbCAvIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpKTtcclxuXHJcbiAgICAgICAgLy9hZGQgaW4gYnVmZmVyXHJcbiAgICAgICAgdmFyIGJ1ZmZlciA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0J1ZmZlcigpIHx8IGNvbnN0YW50cy5ST1dfQlVGRkVSX1NJWkU7XHJcbiAgICAgICAgZmlyc3QgPSBmaXJzdCAtIGJ1ZmZlcjtcclxuICAgICAgICBsYXN0ID0gbGFzdCArIGJ1ZmZlcjtcclxuXHJcbiAgICAgICAgLy8gYWRqdXN0LCBpbiBjYXNlIGJ1ZmZlciBleHRlbmRlZCBhY3R1YWwgc2l6ZVxyXG4gICAgICAgIGlmIChmaXJzdCA8IDApIHtcclxuICAgICAgICAgICAgZmlyc3QgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobGFzdCA+IHJvd0NvdW50IC0gMSkge1xyXG4gICAgICAgICAgICBsYXN0ID0gcm93Q291bnQgLSAxO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmZpcnN0VmlydHVhbFJlbmRlcmVkUm93ID0gZmlyc3Q7XHJcbiAgICB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3cgPSBsYXN0O1xyXG5cclxuICAgIHRoaXMuZW5zdXJlUm93c1JlbmRlcmVkKCk7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0Rmlyc3RWaXJ0dWFsUmVuZGVyZWRSb3cgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmZpcnN0VmlydHVhbFJlbmRlcmVkUm93O1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldExhc3RWaXJ0dWFsUmVuZGVyZWRSb3cgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3c7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZW5zdXJlUm93c1JlbmRlcmVkID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdmFyIG1haW5Sb3dXaWR0aCA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0Qm9keUNvbnRhaW5lcldpZHRoKCk7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgLy8gYXQgdGhlIGVuZCwgdGhpcyBhcnJheSB3aWxsIGNvbnRhaW4gdGhlIGl0ZW1zIHdlIG5lZWQgdG8gcmVtb3ZlXHJcbiAgICB2YXIgcm93c1RvUmVtb3ZlID0gT2JqZWN0LmtleXModGhpcy5yZW5kZXJlZFJvd3MpO1xyXG5cclxuICAgIC8vIGFkZCBpbiBuZXcgcm93c1xyXG4gICAgZm9yICh2YXIgcm93SW5kZXggPSB0aGlzLmZpcnN0VmlydHVhbFJlbmRlcmVkUm93OyByb3dJbmRleCA8PSB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3c7IHJvd0luZGV4KyspIHtcclxuICAgICAgICAvLyBzZWUgaWYgaXRlbSBhbHJlYWR5IHRoZXJlLCBhbmQgaWYgeWVzLCB0YWtlIGl0IG91dCBvZiB0aGUgJ3RvIHJlbW92ZScgYXJyYXlcclxuICAgICAgICBpZiAocm93c1RvUmVtb3ZlLmluZGV4T2Yocm93SW5kZXgudG9TdHJpbmcoKSkgPj0gMCkge1xyXG4gICAgICAgICAgICByb3dzVG9SZW1vdmUuc3BsaWNlKHJvd3NUb1JlbW92ZS5pbmRleE9mKHJvd0luZGV4LnRvU3RyaW5nKCkpLCAxKTtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNoZWNrIHRoaXMgcm93IGFjdHVhbGx5IGV4aXN0cyAoaW4gY2FzZSBvdmVyZmxvdyBidWZmZXIgd2luZG93IGV4Y2VlZHMgcmVhbCBkYXRhKVxyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KHJvd0luZGV4KTtcclxuICAgICAgICBpZiAobm9kZSkge1xyXG4gICAgICAgICAgICB0aGF0Lmluc2VydFJvdyhub2RlLCByb3dJbmRleCwgbWFpblJvd1dpZHRoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYXQgdGhpcyBwb2ludCwgZXZlcnl0aGluZyBpbiBvdXIgJ3Jvd3NUb1JlbW92ZScgLiAuIC5cclxuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlKTtcclxuXHJcbiAgICAvLyBpZiB3ZSBhcmUgZG9pbmcgYW5ndWxhciBjb21waWxpbmcsIHRoZW4gZG8gZGlnZXN0IHRoZSBzY29wZSBoZXJlXHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZVJvd3MoKSkge1xyXG4gICAgICAgIC8vIHdlIGRvIGl0IGluIGEgdGltZW91dCwgaW4gY2FzZSB3ZSBhcmUgYWxyZWFkeSBpbiBhbiBhcHBseVxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoYXQuJHNjb3BlLiRhcHBseSgpO1xyXG4gICAgICAgIH0sIDApO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmluc2VydFJvdyA9IGZ1bmN0aW9uKG5vZGUsIHJvd0luZGV4LCBtYWluUm93V2lkdGgpIHtcclxuICAgIHZhciBjb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKCk7XHJcbiAgICAvLyBpZiBubyBjb2xzLCBkb24ndCBkcmF3IHJvd1xyXG4gICAgaWYgKCFjb2x1bW5zIHx8IGNvbHVtbnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdmFyIHJvd0RhdGEgPSBub2RlLnJvd0RhdGE7XHJcbiAgICB2YXIgcm93SXNBR3JvdXAgPSBub2RlLmdyb3VwO1xyXG5cclxuICAgIC8vIHRyeSBjb21waWxpbmcgYXMgd2UgaW5zZXJ0IHJvd3NcclxuICAgIHZhciBuZXdDaGlsZFNjb3BlID0gdGhpcy5jcmVhdGVDaGlsZFNjb3BlT3JOdWxsKG5vZGUuZGF0YSk7XHJcblxyXG4gICAgdmFyIGVQaW5uZWRSb3cgPSB0aGlzLmNyZWF0ZVJvd0NvbnRhaW5lcihyb3dJbmRleCwgbm9kZSwgcm93SXNBR3JvdXAsIG5ld0NoaWxkU2NvcGUpO1xyXG4gICAgdmFyIGVNYWluUm93ID0gdGhpcy5jcmVhdGVSb3dDb250YWluZXIocm93SW5kZXgsIG5vZGUsIHJvd0lzQUdyb3VwLCBuZXdDaGlsZFNjb3BlKTtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICBlTWFpblJvdy5zdHlsZS53aWR0aCA9IG1haW5Sb3dXaWR0aCArIFwicHhcIjtcclxuXHJcbiAgICB2YXIgcmVuZGVyZWRSb3cgPSB7XHJcbiAgICAgICAgc2NvcGU6IG5ld0NoaWxkU2NvcGUsXHJcbiAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXHJcbiAgICAgICAgZUNlbGxzOiB7fSxcclxuICAgICAgICBlVm9sYXRpbGVDZWxsczoge31cclxuICAgIH07XHJcbiAgICB0aGlzLnJlbmRlcmVkUm93c1tyb3dJbmRleF0gPSByZW5kZXJlZFJvdztcclxuICAgIHRoaXMucmVuZGVyZWRSb3dTdGFydEVkaXRpbmdMaXN0ZW5lcnNbcm93SW5kZXhdID0ge307XHJcblxyXG4gICAgLy8gaWYgZ3JvdXAgaXRlbSwgaW5zZXJ0IHRoZSBmaXJzdCByb3dcclxuICAgIHZhciBncm91cEhlYWRlclRha2VzRW50aXJlUm93ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFVzZUVudGlyZVJvdygpO1xyXG4gICAgdmFyIGRyYXdHcm91cFJvdyA9IHJvd0lzQUdyb3VwICYmIGdyb3VwSGVhZGVyVGFrZXNFbnRpcmVSb3c7XHJcblxyXG4gICAgaWYgKGRyYXdHcm91cFJvdykge1xyXG4gICAgICAgIHZhciBmaXJzdENvbHVtbiA9IGNvbHVtbnNbMF07XHJcblxyXG4gICAgICAgIHZhciBlR3JvdXBSb3cgPSB0aGF0LmNyZWF0ZUdyb3VwRWxlbWVudChub2RlLCByb3dJbmRleCwgZmFsc2UpO1xyXG4gICAgICAgIGlmIChmaXJzdENvbHVtbi5waW5uZWQpIHtcclxuICAgICAgICAgICAgZVBpbm5lZFJvdy5hcHBlbmRDaGlsZChlR3JvdXBSb3cpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGVHcm91cFJvd1BhZGRpbmcgPSB0aGF0LmNyZWF0ZUdyb3VwRWxlbWVudChub2RlLCByb3dJbmRleCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIGVNYWluUm93LmFwcGVuZENoaWxkKGVHcm91cFJvd1BhZGRpbmcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVNYWluUm93LmFwcGVuZENoaWxkKGVHcm91cFJvdyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9JbnRlcm5hbEV4cGFuZGluZygpKSB7XHJcbiAgICAgICAgICAgIGlmIChub2RlLmZpcnN0KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUucGFyZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUucGFyZW50LmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB2YXIgZUdyb3VwUm93ID0gdGhhdC5jZWxsUmVuZGVyZXJNYXBbJ2V4cGFuZCddKHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICBlTWFpblJvdy5zdHlsZS5oZWlnaHQgPSAoMjAgKiBub2RlLnBhcmVudC5yb3dzKSArICdweCc7XHJcbiAgICAgICAgICAgICAgICBlTWFpblJvdy5hcHBlbmRDaGlsZChlR3JvdXBSb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChub2RlLmdyb3VwKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaXJzdENvbCA9IGluZGV4ID09PSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gdGhhdC5nZXREYXRhRm9yTm9kZShub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVHZXR0ZXIgPSB0aGF0LmNyZWF0ZVZhbHVlR2V0dGVyKGRhdGEsIGNvbHVtbi5jb2xEZWYsIG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuY3JlYXRlQ2VsbEZyb21Db2xEZWYoZmlyc3RDb2wsIGNvbHVtbiwgdmFsdWVHZXR0ZXIsIG5vZGUsIHJvd0luZGV4LCBlTWFpblJvdywgZVBpbm5lZFJvdywgbmV3Q2hpbGRTY29wZSwgcmVuZGVyZWRSb3cpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0Q29sID0gaW5kZXggPT09IDA7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHRoYXQuZ2V0RGF0YUZvck5vZGUobm9kZSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVHZXR0ZXIgPSB0aGF0LmNyZWF0ZVZhbHVlR2V0dGVyKGRhdGEsIGNvbHVtbi5jb2xEZWYsIG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgdGhhdC5jcmVhdGVDZWxsRnJvbUNvbERlZihmaXJzdENvbCwgY29sdW1uLCB2YWx1ZUdldHRlciwgbm9kZSwgcm93SW5kZXgsIGVNYWluUm93LCBlUGlubmVkUm93LCBuZXdDaGlsZFNjb3BlLCByZW5kZXJlZFJvdyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL3RyeSBjb21waWxpbmcgYXMgd2UgaW5zZXJ0IHJvd3NcclxuICAgIHJlbmRlcmVkUm93LnBpbm5lZEVsZW1lbnQgPSB0aGlzLmNvbXBpbGVBbmRBZGQodGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lciwgcm93SW5kZXgsIGVQaW5uZWRSb3csIG5ld0NoaWxkU2NvcGUpO1xyXG4gICAgcmVuZGVyZWRSb3cuYm9keUVsZW1lbnQgPSB0aGlzLmNvbXBpbGVBbmRBZGQodGhpcy5lQm9keUNvbnRhaW5lciwgcm93SW5kZXgsIGVNYWluUm93LCBuZXdDaGlsZFNjb3BlKTtcclxufTtcclxuXHJcbi8vIGlmIGdyb3VwIGlzIGEgZm9vdGVyLCBhbHdheXMgc2hvdyB0aGUgZGF0YS5cclxuLy8gaWYgZ3JvdXAgaXMgYSBoZWFkZXIsIG9ubHkgc2hvdyBkYXRhIGlmIG5vdCBleHBhbmRlZFxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0RGF0YUZvck5vZGUgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICBpZiAobm9kZS5mb290ZXIpIHtcclxuICAgICAgICAvLyBpZiBmb290ZXIsIHdlIGFsd2F5cyBzaG93IHRoZSBkYXRhXHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZGF0YTtcclxuICAgIH0gZWxzZSBpZiAobm9kZS5ncm91cCkge1xyXG4gICAgICAgIC8vIGlmIGhlYWRlciBhbmQgaGVhZGVyIGlzIGV4cGFuZGVkLCB3ZSBzaG93IGRhdGEgaW4gZm9vdGVyIG9ubHlcclxuICAgICAgICB2YXIgZm9vdGVyc0VuYWJsZWQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwSW5jbHVkZUZvb3RlcigpO1xyXG4gICAgICAgIHJldHVybiAobm9kZS5leHBhbmRlZCAmJiBmb290ZXJzRW5hYmxlZCkgPyB1bmRlZmluZWQgOiBub2RlLmRhdGE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIG90aGVyd2lzZSBpdCdzIGEgbm9ybWFsIG5vZGUsIGp1c3QgcmV0dXJuIGRhdGEgYXMgbm9ybWFsXHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZGF0YTtcclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVWYWx1ZUdldHRlciA9IGZ1bmN0aW9uKGRhdGEsIGNvbERlZiwgbm9kZSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcGkgPSB0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKTtcclxuICAgICAgICB2YXIgY29udGV4dCA9IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKTtcclxuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUodGhhdC5leHByZXNzaW9uU2VydmljZSwgZGF0YSwgY29sRGVmLCBub2RlLCBhcGksIGNvbnRleHQpO1xyXG4gICAgfTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVDaGlsZFNjb3BlT3JOdWxsID0gZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzQW5ndWxhckNvbXBpbGVSb3dzKCkpIHtcclxuICAgICAgICB2YXIgbmV3Q2hpbGRTY29wZSA9IHRoaXMuJHNjb3BlLiRuZXcoKTtcclxuICAgICAgICBuZXdDaGlsZFNjb3BlLmRhdGEgPSBkYXRhO1xyXG4gICAgICAgIHJldHVybiBuZXdDaGlsZFNjb3BlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jb21waWxlQW5kQWRkID0gZnVuY3Rpb24oY29udGFpbmVyLCByb3dJbmRleCwgZWxlbWVudCwgc2NvcGUpIHtcclxuICAgIGlmIChzY29wZSkge1xyXG4gICAgICAgIHZhciBlRWxlbWVudENvbXBpbGVkID0gdGhpcy4kY29tcGlsZShlbGVtZW50KShzY29wZSk7XHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikgeyAvLyBjaGVja2luZyBjb250YWluZXIsIGFzIGlmIG5vU2Nyb2xsLCBwaW5uZWQgY29udGFpbmVyIGlzIG1pc3NpbmdcclxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGVFbGVtZW50Q29tcGlsZWRbMF0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZUVsZW1lbnRDb21waWxlZFswXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUNlbGxGcm9tQ29sRGVmID0gZnVuY3Rpb24oaXNGaXJzdENvbHVtbiwgY29sdW1uLCB2YWx1ZUdldHRlciwgbm9kZSwgcm93SW5kZXgsIGVNYWluUm93LCBlUGlubmVkUm93LCAkY2hpbGRTY29wZSwgcmVuZGVyZWRSb3cpIHtcclxuICAgIHZhciBlR3JpZENlbGwgPSB0aGlzLmNyZWF0ZUNlbGwoaXNGaXJzdENvbHVtbiwgY29sdW1uLCB2YWx1ZUdldHRlciwgbm9kZSwgcm93SW5kZXgsICRjaGlsZFNjb3BlKTtcclxuXHJcbiAgICBpZiAoY29sdW1uLmNvbERlZi52b2xhdGlsZSkge1xyXG4gICAgICAgIHJlbmRlcmVkUm93LmVWb2xhdGlsZUNlbGxzW2NvbHVtbi5jb2xJZF0gPSBlR3JpZENlbGw7XHJcbiAgICB9XHJcbiAgICByZW5kZXJlZFJvdy5lQ2VsbHNbY29sdW1uLmNvbElkXSA9IGVHcmlkQ2VsbDtcclxuXHJcbiAgICBpZiAoY29sdW1uLnBpbm5lZCkge1xyXG4gICAgICAgIGVQaW5uZWRSb3cuYXBwZW5kQ2hpbGQoZUdyaWRDZWxsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZU1haW5Sb3cuYXBwZW5kQ2hpbGQoZUdyaWRDZWxsKTtcclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDbGFzc2VzVG9Sb3cgPSBmdW5jdGlvbihyb3dJbmRleCwgbm9kZSwgZVJvdykge1xyXG4gICAgdmFyIGNsYXNzZXNMaXN0ID0gW1wiYWctcm93XCJdO1xyXG4gICAgY2xhc3Nlc0xpc3QucHVzaChyb3dJbmRleCAlIDIgPT0gMCA/IFwiYWctcm93LWV2ZW5cIiA6IFwiYWctcm93LW9kZFwiKTtcclxuXHJcbiAgICBpZiAodGhpcy5zZWxlY3Rpb25Db250cm9sbGVyLmlzTm9kZVNlbGVjdGVkKG5vZGUpKSB7XHJcbiAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChcImFnLXJvdy1zZWxlY3RlZFwiKTtcclxuICAgIH1cclxuICAgIGlmIChub2RlLmdyb3VwKSB7XHJcbiAgICAgICAgLy8gaWYgYSBncm91cCwgcHV0IHRoZSBsZXZlbCBvZiB0aGUgZ3JvdXAgaW5cclxuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWxldmVsLVwiICsgbm9kZS5sZXZlbCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIGlmIGEgbGVhZiwgYW5kIGEgcGFyZW50IGV4aXN0cywgcHV0IGEgbGV2ZWwgb2YgdGhlIHBhcmVudCwgZWxzZSBwdXQgbGV2ZWwgb2YgMCBmb3IgdG9wIGxldmVsIGl0ZW1cclxuICAgICAgICBpZiAobm9kZS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChcImFnLXJvdy1sZXZlbC1cIiArIChub2RlLnBhcmVudC5sZXZlbCArIDEpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWxldmVsLTBcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWdyb3VwXCIpO1xyXG4gICAgfVxyXG4gICAgaWYgKG5vZGUuZ3JvdXAgJiYgIW5vZGUuZm9vdGVyICYmIG5vZGUuZXhwYW5kZWQpIHtcclxuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWdyb3VwLWV4cGFuZGVkXCIpO1xyXG4gICAgfVxyXG4gICAgaWYgKG5vZGUuZ3JvdXAgJiYgIW5vZGUuZm9vdGVyICYmICFub2RlLmV4cGFuZGVkKSB7XHJcbiAgICAgICAgLy8gb3Bwb3NpdGUgb2YgZXhwYW5kZWQgaXMgY29udHJhY3RlZCBhY2NvcmRpbmcgdG8gdGhlIGludGVybmV0LlxyXG4gICAgICAgIGNsYXNzZXNMaXN0LnB1c2goXCJhZy1yb3ctZ3JvdXAtY29udHJhY3RlZFwiKTtcclxuICAgIH1cclxuICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuZm9vdGVyKSB7XHJcbiAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChcImFnLXJvdy1mb290ZXJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRkIGluIGV4dHJhIGNsYXNzZXMgcHJvdmlkZWQgYnkgdGhlIGNvbmZpZ1xyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0NsYXNzKCkpIHtcclxuICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXHJcbiAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcclxuICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxyXG4gICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgZXh0cmFSb3dDbGFzc2VzID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93Q2xhc3MoKShwYXJhbXMpO1xyXG4gICAgICAgIGlmIChleHRyYVJvd0NsYXNzZXMpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYVJvd0NsYXNzZXMgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKGV4dHJhUm93Q2xhc3Nlcyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShleHRyYVJvd0NsYXNzZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBleHRyYVJvd0NsYXNzZXMuZm9yRWFjaChmdW5jdGlvbihjbGFzc0l0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKGNsYXNzSXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgY2xhc3NlcyA9IGNsYXNzZXNMaXN0LmpvaW4oXCIgXCIpO1xyXG5cclxuICAgIGVSb3cuY2xhc3NOYW1lID0gY2xhc3NlcztcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVSb3dDb250YWluZXIgPSBmdW5jdGlvbihyb3dJbmRleCwgbm9kZSwgZ3JvdXBSb3csICRzY29wZSkge1xyXG4gICAgdmFyIGVSb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cclxuICAgIHRoaXMuYWRkQ2xhc3Nlc1RvUm93KHJvd0luZGV4LCBub2RlLCBlUm93KTtcclxuXHJcbiAgICBlUm93LnNldEF0dHJpYnV0ZSgncm93Jywgcm93SW5kZXgpO1xyXG5cclxuICAgIC8vIGlmIHNob3dpbmcgc2Nyb2xscywgcG9zaXRpb24gb24gdGhlIGNvbnRhaW5lclxyXG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCkpIHtcclxuICAgICAgICBlUm93LnN0eWxlLnRvcCA9ICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dIZWlnaHQoKSAqIHJvd0luZGV4KSArIFwicHhcIjtcclxuICAgIH1cclxuICAgIGVSb3cuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpKSArIFwicHhcIjtcclxuXHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93U3R5bGUoKSkge1xyXG4gICAgICAgIHZhciBjc3NUb1VzZTtcclxuICAgICAgICB2YXIgcm93U3R5bGUgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dTdHlsZSgpO1xyXG4gICAgICAgIGlmICh0eXBlb2Ygcm93U3R5bGUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUsXHJcbiAgICAgICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpLFxyXG4gICAgICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiAkc2NvcGVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY3NzVG9Vc2UgPSByb3dTdHlsZShwYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNzc1RvVXNlID0gcm93U3R5bGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY3NzVG9Vc2UpIHtcclxuICAgICAgICAgICAgT2JqZWN0LmtleXMoY3NzVG9Vc2UpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBlUm93LnN0eWxlW2tleV0gPSBjc3NUb1VzZVtrZXldO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIGVSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgX3RoaXMuYW5ndWxhckdyaWQub25Sb3dDbGlja2VkKGV2ZW50LCBOdW1iZXIodGhpcy5nZXRBdHRyaWJ1dGUoXCJyb3dcIikpLCBub2RlKVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVSb3c7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0SW5kZXhPZlJlbmRlcmVkTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciByZW5kZXJlZFJvd3MgPSB0aGlzLnJlbmRlcmVkUm93cztcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocmVuZGVyZWRSb3dzKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChyZW5kZXJlZFJvd3Nba2V5c1tpXV0ubm9kZSA9PT0gbm9kZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyZWRSb3dzW2tleXNbaV1dLnJvd0luZGV4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiAtMTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVHcm91cEVsZW1lbnQgPSBmdW5jdGlvbihub2RlLCByb3dJbmRleCwgcGFkZGluZykge1xyXG4gICAgdmFyIGVSb3c7XHJcbiAgICAvLyBwYWRkaW5nIG1lYW5zIHdlIGFyZSBvbiB0aGUgcmlnaHQgaGFuZCBzaWRlIG9mIGEgcGlubmVkIHRhYmxlLCBpZVxyXG4gICAgLy8gaW4gdGhlIG1haW4gYm9keS5cclxuICAgIGlmIChwYWRkaW5nKSB7XHJcbiAgICAgICAgZVJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxyXG4gICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXHJcbiAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXHJcbiAgICAgICAgICAgIGNvbERlZjoge1xyXG4gICAgICAgICAgICAgICAgY2VsbFJlbmRlcmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXI6ICdncm91cCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5uZXJSZW5kZXJlcjogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBSb3dJbm5lclJlbmRlcmVyKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgZVJvdyA9IHRoaXMuY2VsbFJlbmRlcmVyTWFwWydncm91cCddKHBhcmFtcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGUuZm9vdGVyKSB7XHJcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVJvdywgJ2FnLWZvb3Rlci1jZWxsLWVudGlyZS1yb3cnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVJvdywgJ2FnLWdyb3VwLWNlbGwtZW50aXJlLXJvdycpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlUm93O1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnB1dERhdGFJbnRvQ2VsbCA9IGZ1bmN0aW9uKGNvbHVtbiwgdmFsdWUsIHZhbHVlR2V0dGVyLCBub2RlLCAkY2hpbGRTY29wZSwgZVNwYW5XaXRoVmFsdWUsIGVHcmlkQ2VsbCwgcm93SW5kZXgsIHJlZnJlc2hDZWxsRnVuY3Rpb24pIHtcclxuICAgIC8vIHRlbXBsYXRlIGdldHMgcHJlZmVyZW5jZSwgdGhlbiBjZWxsUmVuZGVyZXIsIHRoZW4gZG8gaXQgb3Vyc2VsdmVzXHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuICAgIGlmIChjb2xEZWYudGVtcGxhdGUpIHtcclxuICAgICAgICBlU3BhbldpdGhWYWx1ZS5pbm5lckhUTUwgPSBjb2xEZWYudGVtcGxhdGU7XHJcbiAgICB9IGVsc2UgaWYgKGNvbERlZi50ZW1wbGF0ZVVybCkge1xyXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVTZXJ2aWNlLmdldFRlbXBsYXRlKGNvbERlZi50ZW1wbGF0ZVVybCwgcmVmcmVzaENlbGxGdW5jdGlvbik7XHJcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XHJcbiAgICAgICAgICAgIGVTcGFuV2l0aFZhbHVlLmlubmVySFRNTCA9IHRlbXBsYXRlO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoY29sRGVmLmNlbGxSZW5kZXJlcikge1xyXG4gICAgICAgIHRoaXMudXNlQ2VsbFJlbmRlcmVyKGNvbHVtbiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlU3BhbldpdGhWYWx1ZSwgcm93SW5kZXgsIHJlZnJlc2hDZWxsRnVuY3Rpb24sIHZhbHVlR2V0dGVyLCBlR3JpZENlbGwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBpZiB3ZSBpbnNlcnQgdW5kZWZpbmVkLCB0aGVuIGl0IGRpc3BsYXlzIGFzIHRoZSBzdHJpbmcgJ3VuZGVmaW5lZCcsIHVnbHkhXHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09ICcnKSB7XHJcbiAgICAgICAgICAgIGVTcGFuV2l0aFZhbHVlLmlubmVySFRNTCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS51c2VDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbihjb2x1bW4sIHZhbHVlLCBub2RlLCAkY2hpbGRTY29wZSwgZVNwYW5XaXRoVmFsdWUsIHJvd0luZGV4LCByZWZyZXNoQ2VsbEZ1bmN0aW9uLCB2YWx1ZUdldHRlciwgZUdyaWRDZWxsKSB7XHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuICAgIHZhciByZW5kZXJlclBhcmFtcyA9IHtcclxuICAgICAgICB2YWx1ZTogdmFsdWUsXHJcbiAgICAgICAgdmFsdWVHZXR0ZXI6IHZhbHVlR2V0dGVyLFxyXG4gICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgIGNvbERlZjogY29sRGVmLFxyXG4gICAgICAgIGNvbHVtbjogY29sdW1uLFxyXG4gICAgICAgICRzY29wZTogJGNoaWxkU2NvcGUsXHJcbiAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxyXG4gICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXHJcbiAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxyXG4gICAgICAgIHJlZnJlc2hDZWxsOiByZWZyZXNoQ2VsbEZ1bmN0aW9uLFxyXG4gICAgICAgIGVHcmlkQ2VsbDogZUdyaWRDZWxsXHJcbiAgICB9O1xyXG4gICAgdmFyIGNlbGxSZW5kZXJlcjtcclxuICAgIGlmICh0eXBlb2YgY29sRGVmLmNlbGxSZW5kZXJlciA9PT0gJ29iamVjdCcgJiYgY29sRGVmLmNlbGxSZW5kZXJlciAhPT0gbnVsbCkge1xyXG4gICAgICAgIGNlbGxSZW5kZXJlciA9IHRoaXMuY2VsbFJlbmRlcmVyTWFwW2NvbERlZi5jZWxsUmVuZGVyZXIucmVuZGVyZXJdO1xyXG4gICAgICAgIGlmICghY2VsbFJlbmRlcmVyKSB7XHJcbiAgICAgICAgICAgIHRocm93ICdDZWxsIHJlbmRlcmVyICcgKyBjb2xEZWYuY2VsbFJlbmRlcmVyICsgJyBub3QgZm91bmQsIGF2YWlsYWJsZSBhcmUgJyArIE9iamVjdC5rZXlzKHRoaXMuY2VsbFJlbmRlcmVyTWFwKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2xEZWYuY2VsbFJlbmRlcmVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgY2VsbFJlbmRlcmVyID0gY29sRGVmLmNlbGxSZW5kZXJlcjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgJ0NlbGwgUmVuZGVyZXIgbXVzdCBiZSBTdHJpbmcgb3IgRnVuY3Rpb24nO1xyXG4gICAgfVxyXG4gICAgdmFyIHJlc3VsdEZyb21SZW5kZXJlciA9IGNlbGxSZW5kZXJlcihyZW5kZXJlclBhcmFtcyk7XHJcbiAgICBpZiAodXRpbHMuaXNOb2RlT3JFbGVtZW50KHJlc3VsdEZyb21SZW5kZXJlcikpIHtcclxuICAgICAgICAvLyBhIGRvbSBub2RlIG9yIGVsZW1lbnQgd2FzIHJldHVybmVkLCBzbyBhZGQgY2hpbGRcclxuICAgICAgICBlU3BhbldpdGhWYWx1ZS5hcHBlbmRDaGlsZChyZXN1bHRGcm9tUmVuZGVyZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBvdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxyXG4gICAgICAgIGVTcGFuV2l0aFZhbHVlLmlubmVySFRNTCA9IHJlc3VsdEZyb21SZW5kZXJlcjtcclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRTdHlsZXNGcm9tQ29sbERlZiA9IGZ1bmN0aW9uKGNvbHVtbiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpIHtcclxuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xyXG4gICAgaWYgKGNvbERlZi5jZWxsU3R5bGUpIHtcclxuICAgICAgICB2YXIgY3NzVG9Vc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjb2xEZWYuY2VsbFN0eWxlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHZhciBjZWxsU3R5bGVQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXHJcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgICAgICAgICBjb2x1bW46IGNvbHVtbixcclxuICAgICAgICAgICAgICAgICRzY29wZTogJGNoaWxkU2NvcGUsXHJcbiAgICAgICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXHJcbiAgICAgICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNzc1RvVXNlID0gY29sRGVmLmNlbGxTdHlsZShjZWxsU3R5bGVQYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNzc1RvVXNlID0gY29sRGVmLmNlbGxTdHlsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjc3NUb1VzZSkge1xyXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhjc3NUb1VzZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICAgICAgICAgIGVHcmlkQ2VsbC5zdHlsZVtrZXldID0gY3NzVG9Vc2Vba2V5XTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENsYXNzZXNGcm9tQ29sbERlZiA9IGZ1bmN0aW9uKGNvbERlZiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpIHtcclxuICAgIGlmIChjb2xEZWYuY2VsbENsYXNzKSB7XHJcbiAgICAgICAgdmFyIGNsYXNzVG9Vc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjb2xEZWYuY2VsbENsYXNzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHZhciBjZWxsQ2xhc3NQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXHJcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6ICRjaGlsZFNjb3BlLFxyXG4gICAgICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxyXG4gICAgICAgICAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjbGFzc1RvVXNlID0gY29sRGVmLmNlbGxDbGFzcyhjZWxsQ2xhc3NQYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNsYXNzVG9Vc2UgPSBjb2xEZWYuY2VsbENsYXNzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBjbGFzc1RvVXNlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlR3JpZENlbGwsIGNsYXNzVG9Vc2UpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShjbGFzc1RvVXNlKSkge1xyXG4gICAgICAgICAgICBjbGFzc1RvVXNlLmZvckVhY2goZnVuY3Rpb24oY3NzQ2xhc3NJdGVtKSB7XHJcbiAgICAgICAgICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlR3JpZENlbGwsIGNzc0NsYXNzSXRlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDbGFzc2VzVG9DZWxsID0gZnVuY3Rpb24oY29sdW1uLCBub2RlLCBlR3JpZENlbGwpIHtcclxuICAgIHZhciBjbGFzc2VzID0gWydhZy1jZWxsJywgJ2FnLWNlbGwtbm8tZm9jdXMnLCAnY2VsbC1jb2wtJyArIGNvbHVtbi5pbmRleF07XHJcbiAgICBpZiAobm9kZS5ncm91cCkge1xyXG4gICAgICAgIGlmIChub2RlLmZvb3Rlcikge1xyXG4gICAgICAgICAgICBjbGFzc2VzLnB1c2goJ2FnLWZvb3Rlci1jZWxsJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKCdhZy1ncm91cC1jZWxsJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZUdyaWRDZWxsLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENsYXNzZXNGcm9tUnVsZXMgPSBmdW5jdGlvbihjb2xEZWYsIGVHcmlkQ2VsbCwgdmFsdWUsIG5vZGUsIHJvd0luZGV4KSB7XHJcbiAgICB2YXIgY2xhc3NSdWxlcyA9IGNvbERlZi5jZWxsQ2xhc3NSdWxlcztcclxuICAgIGlmICh0eXBlb2YgY2xhc3NSdWxlcyA9PT0gJ29iamVjdCcgJiYgY2xhc3NSdWxlcyAhPT0gbnVsbCkge1xyXG5cclxuICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXHJcbiAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcclxuICAgICAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKSxcclxuICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGNsYXNzTmFtZXMgPSBPYmplY3Qua2V5cyhjbGFzc1J1bGVzKTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNsYXNzTmFtZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGNsYXNzTmFtZSA9IGNsYXNzTmFtZXNbaV07XHJcbiAgICAgICAgICAgIHZhciBydWxlID0gY2xhc3NSdWxlc1tjbGFzc05hbWVdO1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0T2ZSdWxlO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRPZlJ1bGUgPSB0aGlzLmV4cHJlc3Npb25TZXJ2aWNlLmV2YWx1YXRlKHJ1bGUsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJ1bGUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdE9mUnVsZSA9IHJ1bGUocGFyYW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVzdWx0T2ZSdWxlKSB7XHJcbiAgICAgICAgICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlR3JpZENlbGwsIGNsYXNzTmFtZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB1dGlscy5yZW1vdmVDc3NDbGFzcyhlR3JpZENlbGwsIGNsYXNzTmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlQ2VsbCA9IGZ1bmN0aW9uKGlzRmlyc3RDb2x1bW4sIGNvbHVtbiwgdmFsdWVHZXR0ZXIsIG5vZGUsIHJvd0luZGV4LCAkY2hpbGRTY29wZSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIGVHcmlkQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBlR3JpZENlbGwuc2V0QXR0cmlidXRlKFwiY29sXCIsIGNvbHVtbi5pbmRleCk7XHJcblxyXG4gICAgLy8gb25seSBzZXQgdGFiIGluZGV4IGlmIGNlbGwgc2VsZWN0aW9uIGlzIGVuYWJsZWRcclxuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc0NlbGxTZWxlY3Rpb24oKSkge1xyXG4gICAgICAgIGVHcmlkQ2VsbC5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIi0xXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB2YWx1ZTtcclxuICAgIGlmICh2YWx1ZUdldHRlcikge1xyXG4gICAgICAgIHZhbHVlID0gdmFsdWVHZXR0ZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGVzZSBhcmUgdGhlIGdyaWQgc3R5bGVzLCBkb24ndCBjaGFuZ2UgYmV0d2VlbiBzb2Z0IHJlZnJlc2hlc1xyXG4gICAgdGhpcy5hZGRDbGFzc2VzVG9DZWxsKGNvbHVtbiwgbm9kZSwgZUdyaWRDZWxsKTtcclxuXHJcbiAgICB0aGlzLnBvcHVsYXRlQW5kU3R5bGVHcmlkQ2VsbCh2YWx1ZUdldHRlciwgdmFsdWUsIGVHcmlkQ2VsbCwgaXNGaXJzdENvbHVtbiwgbm9kZSwgY29sdW1uLCByb3dJbmRleCwgJGNoaWxkU2NvcGUpO1xyXG5cclxuICAgIHRoaXMuYWRkQ2VsbENsaWNrZWRIYW5kbGVyKGVHcmlkQ2VsbCwgbm9kZSwgY29sdW1uLCB2YWx1ZSwgcm93SW5kZXgpO1xyXG4gICAgdGhpcy5hZGRDZWxsRG91YmxlQ2xpY2tlZEhhbmRsZXIoZUdyaWRDZWxsLCBub2RlLCBjb2x1bW4sIHZhbHVlLCByb3dJbmRleCwgJGNoaWxkU2NvcGUsIGlzRmlyc3RDb2x1bW4sIHZhbHVlR2V0dGVyKTtcclxuXHJcbiAgICB0aGlzLmFkZENlbGxOYXZpZ2F0aW9uSGFuZGxlcihlR3JpZENlbGwsIHJvd0luZGV4LCBjb2x1bW4sIG5vZGUpO1xyXG5cclxuICAgIGVHcmlkQ2VsbC5zdHlsZS53aWR0aCA9IHV0aWxzLmZvcm1hdFdpZHRoKGNvbHVtbi5hY3R1YWxXaWR0aCk7XHJcblxyXG4gICAgLy8gYWRkIHRoZSAnc3RhcnQgZWRpdGluZycgY2FsbCB0byB0aGUgY2hhaW4gb2YgZWRpdG9yc1xyXG4gICAgdGhpcy5yZW5kZXJlZFJvd1N0YXJ0RWRpdGluZ0xpc3RlbmVyc1tyb3dJbmRleF1bY29sdW1uLmNvbElkXSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmICh0aGF0LmlzQ2VsbEVkaXRhYmxlKGNvbHVtbi5jb2xEZWYsIG5vZGUpKSB7XHJcbiAgICAgICAgICAgIHRoYXQuc3RhcnRFZGl0aW5nKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgcm93SW5kZXgsIGlzRmlyc3RDb2x1bW4sIHZhbHVlR2V0dGVyKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGVHcmlkQ2VsbDtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDZWxsTmF2aWdhdGlvbkhhbmRsZXIgPSBmdW5jdGlvbihlR3JpZENlbGwsIHJvd0luZGV4LCBjb2x1bW4sIG5vZGUpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGVHcmlkQ2VsbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZiAodGhhdC5lZGl0aW5nQ2VsbCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBvbiBrZXkgcHJlc3NlcyB0aGF0IGFyZSBkaXJlY3RseSBvbiB0aGlzIGVsZW1lbnQsIG5vdCBhbnkgY2hpbGRyZW4gZWxlbWVudHMuIHRoaXNcclxuICAgICAgICAvLyBzdG9wcyBuYXZpZ2F0aW9uIGlmIHRoZSB1c2VyIGlzIGluLCBmb3IgZXhhbXBsZSwgYSB0ZXh0IGZpZWxkIGluc2lkZSB0aGUgY2VsbCwgYW5kIHVzZXIgaGl0c1xyXG4gICAgICAgIC8vIG9uIG9mIHRoZSBrZXlzIHdlIGFyZSBsb29raW5nIGZvci5cclxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSBlR3JpZENlbGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGtleSA9IGV2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGU7XHJcblxyXG4gICAgICAgIHZhciBzdGFydE5hdmlnYXRpb24gPSBrZXkgPT09IGNvbnN0YW50cy5LRVlfRE9XTiB8fCBrZXkgPT09IGNvbnN0YW50cy5LRVlfVVBcclxuICAgICAgICAgICAgfHwga2V5ID09PSBjb25zdGFudHMuS0VZX0xFRlQgfHwga2V5ID09PSBjb25zdGFudHMuS0VZX1JJR0hUO1xyXG4gICAgICAgIGlmIChzdGFydE5hdmlnYXRpb24pIHtcclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgdGhhdC5uYXZpZ2F0ZVRvTmV4dENlbGwoa2V5LCByb3dJbmRleCwgY29sdW1uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBzdGFydEVkaXQgPSBrZXkgPT09IGNvbnN0YW50cy5LRVlfRU5URVI7XHJcbiAgICAgICAgaWYgKHN0YXJ0RWRpdCkge1xyXG4gICAgICAgICAgICB2YXIgc3RhcnRFZGl0aW5nRnVuYyA9IHRoYXQucmVuZGVyZWRSb3dTdGFydEVkaXRpbmdMaXN0ZW5lcnNbcm93SW5kZXhdW2NvbHVtbi5jb2xJZF07XHJcbiAgICAgICAgICAgIGlmIChzdGFydEVkaXRpbmdGdW5jKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZWRpdGluZ1N0YXJ0ZWQgPSBzdGFydEVkaXRpbmdGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1N0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3ZSBkb24ndCBwcmV2ZW50IGRlZmF1bHQsIHRoZW4gdGhlIGVkaXRvciB0aGF0IGdldCBkaXNwbGF5ZWQgYWxzbyBwaWNrcyB1cCB0aGUgJ2VudGVyIGtleSdcclxuICAgICAgICAgICAgICAgICAgICAvLyBwcmVzcywgYW5kIHN0b3BzIGVkaXRpbmcgaW1tZWRpYXRlbHksIGhlbmNlIGdpdmluZyBoZSB1c2VyIGV4cGVyaWVuY2UgdGhhdCBub3RoaW5nIGhhcHBlbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHNlbGVjdFJvdyA9IGtleSA9PT0gY29uc3RhbnRzLktFWV9TUEFDRTtcclxuICAgICAgICBpZiAoc2VsZWN0Um93ICYmIHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93U2VsZWN0aW9uKCkpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLmlzTm9kZVNlbGVjdGVkKG5vZGUpO1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5kZXNlbGVjdE5vZGUobm9kZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuc2VsZWN0Tm9kZShub2RlLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuLy8gd2UgdXNlIGluZGV4IGZvciByb3dzLCBidXQgY29sdW1uIG9iamVjdCBmb3IgY29sdW1ucywgYXMgdGhlIG5leHQgY29sdW1uIChieSBpbmRleCkgbWlnaHQgbm90XHJcbi8vIGJlIHZpc2libGUgKGhlYWRlciBncm91cGluZykgc28gaXQncyBub3QgcmVsaWFibGUsIHNvIHVzaW5nIHRoZSBjb2x1bW4gb2JqZWN0IGluc3RlYWQuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5uYXZpZ2F0ZVRvTmV4dENlbGwgPSBmdW5jdGlvbihrZXksIHJvd0luZGV4LCBjb2x1bW4pIHtcclxuXHJcbiAgICB2YXIgY2VsbFRvRm9jdXMgPSB7cm93SW5kZXg6IHJvd0luZGV4LCBjb2x1bW46IGNvbHVtbn07XHJcbiAgICB2YXIgcmVuZGVyZWRSb3c7XHJcbiAgICB2YXIgZUNlbGw7XHJcblxyXG4gICAgLy8gd2Uga2VlcCBzZWFyY2hpbmcgZm9yIGEgbmV4dCBjZWxsIHVudGlsIHdlIGZpbmQgb25lLiB0aGlzIGlzIGhvdyB0aGUgZ3JvdXAgcm93cyBnZXQgc2tpcHBlZFxyXG4gICAgd2hpbGUgKCFlQ2VsbCkge1xyXG4gICAgICAgIGNlbGxUb0ZvY3VzID0gdGhpcy5nZXROZXh0Q2VsbFRvRm9jdXMoa2V5LCBjZWxsVG9Gb2N1cyk7XHJcbiAgICAgICAgLy8gbm8gbmV4dCBjZWxsIG1lYW5zIHdlIGhhdmUgcmVhY2hlZCBhIGdyaWQgYm91bmRhcnksIGVnIGxlZnQsIHJpZ2h0LCB0b3Agb3IgYm90dG9tIG9mIGdyaWRcclxuICAgICAgICBpZiAoIWNlbGxUb0ZvY3VzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc2VlIGlmIHRoZSBuZXh0IGNlbGwgaXMgc2VsZWN0YWJsZSwgaWYgeWVzLCB1c2UgaXQsIGlmIG5vdCwgc2tpcCBpdFxyXG4gICAgICAgIHJlbmRlcmVkUm93ID0gdGhpcy5yZW5kZXJlZFJvd3NbY2VsbFRvRm9jdXMucm93SW5kZXhdO1xyXG4gICAgICAgIGVDZWxsID0gcmVuZGVyZWRSb3cuZUNlbGxzW2NlbGxUb0ZvY3VzLmNvbHVtbi5jb2xJZF07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdGhpcyBzY3JvbGxzIHRoZSByb3cgaW50byB2aWV3XHJcbiAgICB0aGlzLmdyaWRQYW5lbC5lbnN1cmVJbmRleFZpc2libGUocmVuZGVyZWRSb3cucm93SW5kZXgpO1xyXG5cclxuICAgIC8vIHRoaXMgY2hhbmdlcyB0aGUgY3NzIG9uIHRoZSBjZWxsXHJcbiAgICB0aGlzLmZvY3VzQ2VsbChlQ2VsbCwgY2VsbFRvRm9jdXMucm93SW5kZXgsIGNlbGxUb0ZvY3VzLmNvbHVtbi5pbmRleCwgdHJ1ZSk7XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0TmV4dENlbGxUb0ZvY3VzID0gZnVuY3Rpb24oa2V5LCBsYXN0Q2VsbFRvRm9jdXMpIHtcclxuICAgIHZhciBsYXN0Um93SW5kZXggPSBsYXN0Q2VsbFRvRm9jdXMucm93SW5kZXg7XHJcbiAgICB2YXIgbGFzdENvbHVtbiA9IGxhc3RDZWxsVG9Gb2N1cy5jb2x1bW47XHJcblxyXG4gICAgdmFyIG5leHRSb3dUb0ZvY3VzO1xyXG4gICAgdmFyIG5leHRDb2x1bW5Ub0ZvY3VzO1xyXG4gICAgc3dpdGNoIChrZXkpIHtcclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5LRVlfVVAgOlxyXG4gICAgICAgICAgICAvLyBpZiBhbHJlYWR5IG9uIHRvcCByb3csIGRvIG5vdGhpbmdcclxuICAgICAgICAgICAgaWYgKGxhc3RSb3dJbmRleCA9PT0gdGhpcy5maXJzdFZpcnR1YWxSZW5kZXJlZFJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmV4dFJvd1RvRm9jdXMgPSBsYXN0Um93SW5kZXggLSAxO1xyXG4gICAgICAgICAgICBuZXh0Q29sdW1uVG9Gb2N1cyA9IGxhc3RDb2x1bW47XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzLktFWV9ET1dOIDpcclxuICAgICAgICAgICAgLy8gaWYgYWxyZWFkeSBvbiBib3R0b20sIGRvIG5vdGhpbmdcclxuICAgICAgICAgICAgaWYgKGxhc3RSb3dJbmRleCA9PT0gdGhpcy5sYXN0VmlydHVhbFJlbmRlcmVkUm93KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXh0Um93VG9Gb2N1cyA9IGxhc3RSb3dJbmRleCArIDE7XHJcbiAgICAgICAgICAgIG5leHRDb2x1bW5Ub0ZvY3VzID0gbGFzdENvbHVtbjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHMuS0VZX1JJR0hUIDpcclxuICAgICAgICAgICAgdmFyIGNvbFRvUmlnaHQgPSB0aGlzLmNvbHVtbk1vZGVsLmdldFZpc2libGVDb2xBZnRlcihsYXN0Q29sdW1uKTtcclxuICAgICAgICAgICAgLy8gaWYgYWxyZWFkeSBvbiByaWdodCwgZG8gbm90aGluZ1xyXG4gICAgICAgICAgICBpZiAoIWNvbFRvUmlnaHQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5leHRSb3dUb0ZvY3VzID0gbGFzdFJvd0luZGV4IDtcclxuICAgICAgICAgICAgbmV4dENvbHVtblRvRm9jdXMgPSBjb2xUb1JpZ2h0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGNvbnN0YW50cy5LRVlfTEVGVCA6XHJcbiAgICAgICAgICAgIHZhciBjb2xUb0xlZnQgPSB0aGlzLmNvbHVtbk1vZGVsLmdldFZpc2libGVDb2xCZWZvcmUobGFzdENvbHVtbik7XHJcbiAgICAgICAgICAgIC8vIGlmIGFscmVhZHkgb24gbGVmdCwgZG8gbm90aGluZ1xyXG4gICAgICAgICAgICBpZiAoIWNvbFRvTGVmdCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmV4dFJvd1RvRm9jdXMgPSBsYXN0Um93SW5kZXggO1xyXG4gICAgICAgICAgICBuZXh0Q29sdW1uVG9Gb2N1cyA9IGNvbFRvTGVmdDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByb3dJbmRleDogbmV4dFJvd1RvRm9jdXMsXHJcbiAgICAgICAgY29sdW1uOiBuZXh0Q29sdW1uVG9Gb2N1c1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8vIGNhbGxlZCBpbnRlcm5hbGx5XHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5mb2N1c0NlbGwgPSBmdW5jdGlvbihlQ2VsbCwgcm93SW5kZXgsIGNvbEluZGV4LCBmb3JjZUJyb3dzZXJGb2N1cykge1xyXG4gICAgLy8gZG8gbm90aGluZyBpZiBjZWxsIHNlbGVjdGlvbiBpcyBvZmZcclxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc1N1cHByZXNzQ2VsbFNlbGVjdGlvbigpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlbW92ZSBhbnkgcHJldmlvdXMgZm9jdXNcclxuICAgIHV0aWxzLnF1ZXJ5U2VsZWN0b3JBbGxfcmVwbGFjZUNzc0NsYXNzKHRoaXMuZVBhcmVudE9mUm93cywgJy5hZy1jZWxsLWZvY3VzJywgJ2FnLWNlbGwtZm9jdXMnLCAnYWctY2VsbC1uby1mb2N1cycpO1xyXG5cclxuICAgIHZhciBzZWxlY3RvckZvckNlbGwgPSAnW3Jvdz1cIicgKyByb3dJbmRleCArICdcIl0gW2NvbD1cIicgKyBjb2xJbmRleCArICdcIl0nO1xyXG4gICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9yZXBsYWNlQ3NzQ2xhc3ModGhpcy5lUGFyZW50T2ZSb3dzLCBzZWxlY3RvckZvckNlbGwsICdhZy1jZWxsLW5vLWZvY3VzJywgJ2FnLWNlbGwtZm9jdXMnKTtcclxuXHJcbiAgICB0aGlzLmZvY3VzZWRDZWxsID0ge3Jvd0luZGV4OiByb3dJbmRleCwgY29sSW5kZXg6IGNvbEluZGV4LCBub2RlOiB0aGlzLnJvd01vZGVsLmdldFZpcnR1YWxSb3cocm93SW5kZXgpfTtcclxuXHJcbiAgICAvLyB0aGlzIHB1dHMgdGhlIGJyb3dzZXIgZm9jdXMgb24gdGhlIGNlbGwgKHNvIGl0IGdldHMga2V5IHByZXNzZXMpXHJcbiAgICBpZiAoZm9yY2VCcm93c2VyRm9jdXMpIHtcclxuICAgICAgICBlQ2VsbC5mb2N1cygpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbEZvY3VzZWQoKSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENlbGxGb2N1c2VkKCkodGhpcy5mb2N1c2VkQ2VsbCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBmb3IgQVBJXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRGb2N1c2VkQ2VsbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZm9jdXNlZENlbGw7XHJcbn07XHJcblxyXG4vLyBjYWxsZWQgdmlhIEFQSVxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc2V0Rm9jdXNlZENlbGwgPSBmdW5jdGlvbihyb3dJbmRleCwgY29sSW5kZXgpIHtcclxuICAgIHZhciByZW5kZXJlZFJvdyA9IHRoaXMucmVuZGVyZWRSb3dzW3Jvd0luZGV4XTtcclxuICAgIHZhciBjb2x1bW4gPSB0aGlzLmNvbHVtbk1vZGVsLmdldERpc3BsYXllZENvbHVtbnMoKVtjb2xJbmRleF07XHJcbiAgICBpZiAocmVuZGVyZWRSb3cgJiYgY29sdW1uKSB7XHJcbiAgICAgICAgdmFyIGVDZWxsID0gcmVuZGVyZWRSb3cuZUNlbGxzW2NvbHVtbi5jb2xJZF07XHJcbiAgICAgICAgdGhpcy5mb2N1c0NlbGwoZUNlbGwsIHJvd0luZGV4LCBjb2xJbmRleCwgdHJ1ZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucG9wdWxhdGVBbmRTdHlsZUdyaWRDZWxsID0gZnVuY3Rpb24odmFsdWVHZXR0ZXIsIHZhbHVlLCBlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsICRjaGlsZFNjb3BlKSB7XHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuXHJcbiAgICAvLyBwb3B1bGF0ZVxyXG4gICAgdGhpcy5wb3B1bGF0ZUdyaWRDZWxsKGVHcmlkQ2VsbCwgaXNGaXJzdENvbHVtbiwgbm9kZSwgY29sdW1uLCByb3dJbmRleCwgdmFsdWUsIHZhbHVlR2V0dGVyLCAkY2hpbGRTY29wZSk7XHJcbiAgICAvLyBzdHlsZVxyXG4gICAgdGhpcy5hZGRTdHlsZXNGcm9tQ29sbERlZihjb2x1bW4sIHZhbHVlLCBub2RlLCAkY2hpbGRTY29wZSwgZUdyaWRDZWxsKTtcclxuICAgIHRoaXMuYWRkQ2xhc3Nlc0Zyb21Db2xsRGVmKGNvbERlZiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpO1xyXG4gICAgdGhpcy5hZGRDbGFzc2VzRnJvbVJ1bGVzKGNvbERlZiwgZUdyaWRDZWxsLCB2YWx1ZSwgbm9kZSwgcm93SW5kZXgpO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnBvcHVsYXRlR3JpZENlbGwgPSBmdW5jdGlvbihlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsIHZhbHVlLCB2YWx1ZUdldHRlciwgJGNoaWxkU2NvcGUpIHtcclxuICAgIHZhciBlQ2VsbFdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhlQ2VsbFdyYXBwZXIsIFwiYWctY2VsbC13cmFwcGVyXCIpO1xyXG4gICAgZUdyaWRDZWxsLmFwcGVuZENoaWxkKGVDZWxsV3JhcHBlcik7XHJcblxyXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XHJcbiAgICBpZiAoY29sRGVmLmNoZWNrYm94U2VsZWN0aW9uKSB7XHJcbiAgICAgICAgdmFyIGVDaGVja2JveCA9IHRoaXMuc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LmNyZWF0ZVNlbGVjdGlvbkNoZWNrYm94KG5vZGUsIHJvd0luZGV4KTtcclxuICAgICAgICBlQ2VsbFdyYXBwZXIuYXBwZW5kQ2hpbGQoZUNoZWNrYm94KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBldmVudHVhbGx5IHdlIGNhbGwgZVNwYW5XaXRoVmFsdWUuaW5uZXJIVE1MID0geHh4LCBzbyBjYW5ub3QgaW5jbHVkZSB0aGUgY2hlY2tib3ggKGFib3ZlKSBpbiB0aGlzIHNwYW5cclxuICAgIHZhciBlU3BhbldpdGhWYWx1ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVNwYW5XaXRoVmFsdWUsIFwiYWctY2VsbC12YWx1ZVwiKTtcclxuXHJcbiAgICBlQ2VsbFdyYXBwZXIuYXBwZW5kQ2hpbGQoZVNwYW5XaXRoVmFsdWUpO1xyXG5cclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciByZWZyZXNoQ2VsbEZ1bmN0aW9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5zb2Z0UmVmcmVzaENlbGwoZUdyaWRDZWxsLCBpc0ZpcnN0Q29sdW1uLCBub2RlLCBjb2x1bW4sICRjaGlsZFNjb3BlLCByb3dJbmRleCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMucHV0RGF0YUludG9DZWxsKGNvbHVtbiwgdmFsdWUsIHZhbHVlR2V0dGVyLCBub2RlLCAkY2hpbGRTY29wZSwgZVNwYW5XaXRoVmFsdWUsIGVHcmlkQ2VsbCwgcm93SW5kZXgsIHJlZnJlc2hDZWxsRnVuY3Rpb24pO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENlbGxEb3VibGVDbGlja2VkSGFuZGxlciA9IGZ1bmN0aW9uKGVHcmlkQ2VsbCwgbm9kZSwgY29sdW1uLCB2YWx1ZSwgcm93SW5kZXgsICRjaGlsZFNjb3BlLCBpc0ZpcnN0Q29sdW1uLCB2YWx1ZUdldHRlcikge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XHJcbiAgICBlR3JpZENlbGwuYWRkRXZlbnRMaXN0ZW5lcihcImRibGNsaWNrXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENlbGxEb3VibGVDbGlja2VkKCkpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtc0ZvckdyaWQgPSB7XHJcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxyXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnQsXHJcbiAgICAgICAgICAgICAgICBldmVudFNvdXJjZTogdGhpcyxcclxuICAgICAgICAgICAgICAgIGFwaTogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbERvdWJsZUNsaWNrZWQoKShwYXJhbXNGb3JHcmlkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbERlZi5jZWxsRG91YmxlQ2xpY2tlZCkge1xyXG4gICAgICAgICAgICB2YXIgcGFyYW1zRm9yQ29sRGVmID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcclxuICAgICAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxyXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRTb3VyY2U6IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBhcGk6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbERlZi5jZWxsRG91YmxlQ2xpY2tlZChwYXJhbXNGb3JDb2xEZWYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhhdC5pc0NlbGxFZGl0YWJsZShjb2xEZWYsIG5vZGUpKSB7XHJcbiAgICAgICAgICAgIHRoYXQuc3RhcnRFZGl0aW5nKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgcm93SW5kZXgsIGlzRmlyc3RDb2x1bW4sIHZhbHVlR2V0dGVyKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDZWxsQ2xpY2tlZEhhbmRsZXIgPSBmdW5jdGlvbihlR3JpZENlbGwsIG5vZGUsIGNvbHVtbiwgdmFsdWUsIHJvd0luZGV4KSB7XHJcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGVHcmlkQ2VsbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAvLyB3ZSBwYXNzIGZhbHNlIHRvIGZvY3VzQ2VsbCwgYXMgd2UgZG9uJ3Qgd2FudCB0aGUgY2VsbCB0byBmb2N1c1xyXG4gICAgICAgIC8vIGFsc28gZ2V0IHRoZSBicm93c2VyIGZvY3VzLiBpZiB3ZSBkaWQsIHRoZW4gdGhlIGNlbGxSZW5kZXJlciBjb3VsZFxyXG4gICAgICAgIC8vIGhhdmUgYSB0ZXh0IGZpZWxkIGluIGl0LCBmb3IgZXhhbXBsZSwgYW5kIGFzIHRoZSB1c2VyIGNsaWNrcyBvbiB0aGVcclxuICAgICAgICAvLyB0ZXh0IGZpZWxkLCB0aGUgdGV4dCBmaWVsZCwgdGhlIGZvY3VzIGRvZXNuJ3QgZ2V0IHRvIHRoZSB0ZXh0XHJcbiAgICAgICAgLy8gZmllbGQsIGluc3RlYWQgdG8gZ29lcyB0byB0aGUgZGl2IGJlaGluZCwgbWFraW5nIGl0IGltcG9zc2libGUgdG9cclxuICAgICAgICAvLyBzZWxlY3QgdGhlIHRleHQgZmllbGQuXHJcbiAgICAgICAgdGhhdC5mb2N1c0NlbGwoZUdyaWRDZWxsLCByb3dJbmRleCwgY29sdW1uLmluZGV4LCBmYWxzZSk7XHJcbiAgICAgICAgaWYgKHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENlbGxDbGlja2VkKCkpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtc0ZvckdyaWQgPSB7XHJcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxyXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnQsXHJcbiAgICAgICAgICAgICAgICBldmVudFNvdXJjZTogdGhpcyxcclxuICAgICAgICAgICAgICAgIGFwaTogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbENsaWNrZWQoKShwYXJhbXNGb3JHcmlkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbERlZi5jZWxsQ2xpY2tlZCkge1xyXG4gICAgICAgICAgICB2YXIgcGFyYW1zRm9yQ29sRGVmID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcclxuICAgICAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxyXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRTb3VyY2U6IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBhcGk6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbERlZi5jZWxsQ2xpY2tlZChwYXJhbXNGb3JDb2xEZWYpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLmlzQ2VsbEVkaXRhYmxlID0gZnVuY3Rpb24oY29sRGVmLCBub2RlKSB7XHJcbiAgICBpZiAodGhpcy5lZGl0aW5nQ2VsbCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBuZXZlciBhbGxvdyBlZGl0aW5nIG9mIGdyb3Vwc1xyXG4gICAgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgYm9vbGVhbiBzZXQsIHRoZW4ganVzdCB1c2UgaXRcclxuICAgIGlmICh0eXBlb2YgY29sRGVmLmVkaXRhYmxlID09PSAnYm9vbGVhbicpIHtcclxuICAgICAgICByZXR1cm4gY29sRGVmLmVkaXRhYmxlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIGZ1bmN0aW9uLCB0aGVuIGNhbGwgdGhlIGZ1bmN0aW9uIHRvIGZpbmQgb3V0XHJcbiAgICBpZiAodHlwZW9mIGNvbERlZi5lZGl0YWJsZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIC8vIHNob3VsZCBjaGFuZ2UgdGhpcywgc28gaXQgZ2V0cyBwYXNzZWQgcGFyYW1zIHdpdGggbmljZSB1c2VmdWwgdmFsdWVzXHJcbiAgICAgICAgcmV0dXJuIGNvbERlZi5lZGl0YWJsZShub2RlLmRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zdG9wRWRpdGluZyA9IGZ1bmN0aW9uKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgZUlucHV0LCBibHVyTGlzdGVuZXIsIHJvd0luZGV4LCBpc0ZpcnN0Q29sdW1uLCB2YWx1ZUdldHRlcikge1xyXG4gICAgdGhpcy5lZGl0aW5nQ2VsbCA9IGZhbHNlO1xyXG4gICAgdmFyIG5ld1ZhbHVlID0gZUlucHV0LnZhbHVlO1xyXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XHJcblxyXG4gICAgLy9JZiB3ZSBkb24ndCByZW1vdmUgdGhlIGJsdXIgbGlzdGVuZXIgZmlyc3QsIHdlIGdldDpcclxuICAgIC8vVW5jYXVnaHQgTm90Rm91bmRFcnJvcjogRmFpbGVkIHRvIGV4ZWN1dGUgJ3JlbW92ZUNoaWxkJyBvbiAnTm9kZSc6IFRoZSBub2RlIHRvIGJlIHJlbW92ZWQgaXMgbm8gbG9uZ2VyIGEgY2hpbGQgb2YgdGhpcyBub2RlLiBQZXJoYXBzIGl0IHdhcyBtb3ZlZCBpbiBhICdibHVyJyBldmVudCBoYW5kbGVyP1xyXG4gICAgZUlucHV0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBibHVyTGlzdGVuZXIpO1xyXG5cclxuICAgIHV0aWxzLnJlbW92ZUFsbENoaWxkcmVuKGVHcmlkQ2VsbCk7XHJcblxyXG4gICAgdmFyIHBhcmFtc0ZvckNhbGxiYWNrcyA9IHtcclxuICAgICAgICBub2RlOiBub2RlLFxyXG4gICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcclxuICAgICAgICBvbGRWYWx1ZTogbm9kZS5kYXRhW2NvbERlZi5maWVsZF0sXHJcbiAgICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlLFxyXG4gICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcclxuICAgICAgICBjb2xEZWY6IGNvbERlZixcclxuICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpLFxyXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAoY29sRGVmLm5ld1ZhbHVlSGFuZGxlcikge1xyXG4gICAgICAgIGNvbERlZi5uZXdWYWx1ZUhhbmRsZXIocGFyYW1zRm9yQ2FsbGJhY2tzKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbm9kZS5kYXRhW2NvbERlZi5maWVsZF0gPSBuZXdWYWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhdCB0aGlzIHBvaW50LCB0aGUgdmFsdWUgaGFzIGJlZW4gdXBkYXRlZFxyXG4gICAgdmFyIG5ld1ZhbHVlO1xyXG4gICAgaWYgKHZhbHVlR2V0dGVyKSB7XHJcbiAgICAgICAgbmV3VmFsdWUgPSB2YWx1ZUdldHRlcigpO1xyXG4gICAgfVxyXG4gICAgcGFyYW1zRm9yQ2FsbGJhY2tzLm5ld1ZhbHVlID0gbmV3VmFsdWU7XHJcbiAgICBpZiAodHlwZW9mIGNvbERlZi5jZWxsVmFsdWVDaGFuZ2VkID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgY29sRGVmLmNlbGxWYWx1ZUNoYW5nZWQocGFyYW1zRm9yQ2FsbGJhY2tzKTtcclxuICAgIH1cclxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbFZhbHVlQ2hhbmdlZCgpID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbFZhbHVlQ2hhbmdlZCgpKHBhcmFtc0ZvckNhbGxiYWNrcyk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wb3B1bGF0ZUFuZFN0eWxlR3JpZENlbGwodmFsdWVHZXR0ZXIsIG5ld1ZhbHVlLCBlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsICRjaGlsZFNjb3BlKTtcclxufTtcclxuXHJcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zdGFydEVkaXRpbmcgPSBmdW5jdGlvbihlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIHJvd0luZGV4LCBpc0ZpcnN0Q29sdW1uLCB2YWx1ZUdldHRlcikge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5lZGl0aW5nQ2VsbCA9IHRydWU7XHJcbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbihlR3JpZENlbGwpO1xyXG4gICAgdmFyIGVJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICBlSW5wdXQudHlwZSA9ICd0ZXh0JztcclxuICAgIHV0aWxzLmFkZENzc0NsYXNzKGVJbnB1dCwgJ2FnLWNlbGwtZWRpdC1pbnB1dCcpO1xyXG5cclxuICAgIGlmICh2YWx1ZUdldHRlcikge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHZhbHVlR2V0dGVyKCk7XHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZUlucHV0LnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGVJbnB1dC5zdHlsZS53aWR0aCA9IChjb2x1bW4uYWN0dWFsV2lkdGggLSAxNCkgKyAncHgnO1xyXG4gICAgZUdyaWRDZWxsLmFwcGVuZENoaWxkKGVJbnB1dCk7XHJcbiAgICBlSW5wdXQuZm9jdXMoKTtcclxuICAgIGVJbnB1dC5zZWxlY3QoKTtcclxuXHJcbiAgICB2YXIgYmx1ckxpc3RlbmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5zdG9wRWRpdGluZyhlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIGVJbnB1dCwgYmx1ckxpc3RlbmVyLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xyXG4gICAgfTtcclxuXHJcbiAgICAvL3N0b3AgZW50ZXJpbmcgaWYgd2UgbG9vc2UgZm9jdXNcclxuICAgIGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCBibHVyTGlzdGVuZXIpO1xyXG5cclxuICAgIC8vc3RvcCBlZGl0aW5nIGlmIGVudGVyIHByZXNzZWRcclxuICAgIGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGtleSA9IGV2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGU7XHJcbiAgICAgICAgLy8gMTMgaXMgZW50ZXJcclxuICAgICAgICBpZiAoa2V5ID09IGNvbnN0YW50cy5LRVlfRU5URVIpIHtcclxuICAgICAgICAgICAgdGhhdC5zdG9wRWRpdGluZyhlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIGVJbnB1dCwgYmx1ckxpc3RlbmVyLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xyXG4gICAgICAgICAgICB0aGF0LmZvY3VzQ2VsbChlR3JpZENlbGwsIHJvd0luZGV4LCBjb2x1bW4uaW5kZXgsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIHRhYiBrZXkgZG9lc24ndCBnZW5lcmF0ZSBrZXlwcmVzcywgc28gbmVlZCBrZXlkb3duIHRvIGxpc3RlbiBmb3IgdGhhdFxyXG4gICAgZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciBrZXkgPSBldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlO1xyXG4gICAgICAgIGlmIChrZXkgPT0gY29uc3RhbnRzLktFWV9UQUIpIHtcclxuICAgICAgICAgICAgdGhhdC5zdG9wRWRpdGluZyhlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIGVJbnB1dCwgYmx1ckxpc3RlbmVyLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xyXG4gICAgICAgICAgICB0aGF0LnN0YXJ0RWRpdGluZ05leHRDZWxsKHJvd0luZGV4LCBjb2x1bW4sIGV2ZW50LnNoaWZ0S2V5KTtcclxuICAgICAgICAgICAgLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZGVmYXVsdCB0YWIgYWN0aW9uLCBzbyByZXR1cm4gZmFsc2UsIHRoaXMgc3RvcHMgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuUm93UmVuZGVyZXIucHJvdG90eXBlLnN0YXJ0RWRpdGluZ05leHRDZWxsID0gZnVuY3Rpb24ocm93SW5kZXgsIGNvbHVtbiwgc2hpZnRLZXkpIHtcclxuXHJcbiAgICB2YXIgZmlyc3RSb3dUb0NoZWNrID0gdGhpcy5maXJzdFZpcnR1YWxSZW5kZXJlZFJvdztcclxuICAgIHZhciBsYXN0Um93VG9DaGVjayA9IHRoaXMubGFzdFZpcnR1YWxSZW5kZXJlZFJvdztcclxuICAgIHZhciBjdXJyZW50Um93SW5kZXggPSByb3dJbmRleDtcclxuXHJcbiAgICB2YXIgdmlzaWJsZUNvbHVtbnMgPSB0aGlzLmNvbHVtbk1vZGVsLmdldERpc3BsYXllZENvbHVtbnMoKTtcclxuICAgIHZhciBjdXJyZW50Q29sID0gY29sdW1uO1xyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcblxyXG4gICAgICAgIHZhciBpbmRleE9mQ3VycmVudENvbCA9IHZpc2libGVDb2x1bW5zLmluZGV4T2YoY3VycmVudENvbCk7XHJcblxyXG4gICAgICAgIC8vIG1vdmUgYmFja3dhcmRcclxuICAgICAgICBpZiAoc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgLy8gbW92ZSBhbG9uZyB0byB0aGUgcHJldmlvdXMgY2VsbFxyXG4gICAgICAgICAgICBjdXJyZW50Q29sID0gdmlzaWJsZUNvbHVtbnNbaW5kZXhPZkN1cnJlbnRDb2wgLSAxXTtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgZW5kIG9mIHRoZSByb3csIGFuZCBpZiBzbywgZ28gYmFjayBhIHJvd1xyXG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRDb2wpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRDb2wgPSB2aXNpYmxlQ29sdW1uc1t2aXNpYmxlQ29sdW1ucy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRSb3dJbmRleC0tO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBpZiBnb3QgdG8gZW5kIG9mIHJlbmRlcmVkIHJvd3MsIHRoZW4gcXVpdCBsb29raW5nXHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50Um93SW5kZXggPCBmaXJzdFJvd1RvQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBtb3ZlIGZvcndhcmRcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBtb3ZlIGFsb25nIHRvIHRoZSBuZXh0IGNlbGxcclxuICAgICAgICAgICAgY3VycmVudENvbCA9IHZpc2libGVDb2x1bW5zW2luZGV4T2ZDdXJyZW50Q29sICsgMV07XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGVuZCBvZiB0aGUgcm93LCBhbmQgaWYgc28sIGdvIGZvcndhcmQgYSByb3dcclxuICAgICAgICAgICAgaWYgKCFjdXJyZW50Q29sKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50Q29sID0gdmlzaWJsZUNvbHVtbnNbMF07XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50Um93SW5kZXgrKztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gaWYgZ290IHRvIGVuZCBvZiByZW5kZXJlZCByb3dzLCB0aGVuIHF1aXQgbG9va2luZ1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFJvd0luZGV4ID4gbGFzdFJvd1RvQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG5leHRGdW5jID0gdGhpcy5yZW5kZXJlZFJvd1N0YXJ0RWRpdGluZ0xpc3RlbmVyc1tjdXJyZW50Um93SW5kZXhdW2N1cnJlbnRDb2wuY29sSWRdO1xyXG4gICAgICAgIGlmIChuZXh0RnVuYykge1xyXG4gICAgICAgICAgICAvLyBzZWUgaWYgdGhlIG5leHQgY2VsbCBpcyBlZGl0YWJsZSwgYW5kIGlmIHNvLCB3ZSBoYXZlIGNvbWUgdG9cclxuICAgICAgICAgICAgLy8gdGhlIGVuZCBvZiBvdXIgc2VhcmNoLCBzbyBzdG9wIGxvb2tpbmcgZm9yIHRoZSBuZXh0IGNlbGxcclxuICAgICAgICAgICAgdmFyIG5leHRDZWxsQWNjZXB0ZWRFZGl0ID0gbmV4dEZ1bmMoKTtcclxuICAgICAgICAgICAgaWYgKG5leHRDZWxsQWNjZXB0ZWRFZGl0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSb3dSZW5kZXJlcjtcclxuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxuLy8gdGhlc2UgY29uc3RhbnRzIGFyZSB1c2VkIGZvciBkZXRlcm1pbmluZyBpZiBncm91cHMgc2hvdWxkXHJcbi8vIGJlIHNlbGVjdGVkIG9yIGRlc2VsZWN0ZWQgd2hlbiBzZWxlY3RpbmcgZ3JvdXBzLCBhbmQgdGhlIGdyb3VwXHJcbi8vIHRoZW4gc2VsZWN0cyB0aGUgY2hpbGRyZW4uXHJcbnZhciBTRUxFQ1RFRCA9IDA7XHJcbnZhciBVTlNFTEVDVEVEID0gMTtcclxudmFyIE1JWEVEID0gMjtcclxudmFyIERPX05PVF9DQVJFID0gMztcclxuXHJcbmZ1bmN0aW9uIFNlbGVjdGlvbkNvbnRyb2xsZXIoKSB7fVxyXG5cclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGFuZ3VsYXJHcmlkLCBncmlkUGFuZWwsIGdyaWRPcHRpb25zV3JhcHBlciwgJHNjb3BlLCByb3dSZW5kZXJlcikge1xyXG4gICAgdGhpcy5lUm93c1BhcmVudCA9IGdyaWRQYW5lbC5nZXRSb3dzUGFyZW50KCk7XHJcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XHJcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcclxuICAgIHRoaXMuJHNjb3BlID0gJHNjb3BlO1xyXG4gICAgdGhpcy5yb3dSZW5kZXJlciA9IHJvd1JlbmRlcmVyO1xyXG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XHJcblxyXG4gICAgdGhpcy5pbml0U2VsZWN0ZWROb2Rlc0J5SWQoKTtcclxuXHJcbiAgICB0aGlzLnNlbGVjdGVkUm93cyA9IFtdO1xyXG4gICAgZ3JpZE9wdGlvbnNXcmFwcGVyLnNldFNlbGVjdGVkUm93cyh0aGlzLnNlbGVjdGVkUm93cyk7XHJcbn07XHJcblxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5pbml0U2VsZWN0ZWROb2Rlc0J5SWQgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQgPSB7fTtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLnNldFNlbGVjdGVkTm9kZXNCeUlkKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xyXG59O1xyXG5cclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0U2VsZWN0ZWROb2RlcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHNlbGVjdGVkTm9kZXMgPSBbXTtcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zZWxlY3RlZE5vZGVzQnlJZCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgaWQgPSBrZXlzW2ldO1xyXG4gICAgICAgIHZhciBzZWxlY3RlZE5vZGUgPSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW2lkXTtcclxuICAgICAgICBzZWxlY3RlZE5vZGVzLnB1c2goc2VsZWN0ZWROb2RlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzZWxlY3RlZE5vZGVzO1xyXG59O1xyXG5cclxuLy8gcmV0dXJucyBhIGxpc3Qgb2YgYWxsIG5vZGVzIGF0ICdiZXN0IGNvc3QnIC0gYSBmZWF0dXJlIHRvIGJlIHVzZWRcclxuLy8gd2l0aCBncm91cHMgLyB0cmVlcy4gaWYgYSBncm91cCBoYXMgYWxsIGl0J3MgY2hpbGRyZW4gc2VsZWN0ZWQsXHJcbi8vIHRoZW4gdGhlIGdyb3VwIGFwcGVhcnMgaW4gdGhlIHJlc3VsdCwgYnV0IG5vdCB0aGUgY2hpbGRyZW4uXHJcbi8vIERlc2lnbmVkIGZvciB1c2Ugd2l0aCAnY2hpbGRyZW4nIGFzIHRoZSBncm91cCBzZWxlY3Rpb24gdHlwZSxcclxuLy8gd2hlcmUgZ3JvdXBzIGRvbid0IGFjdHVhbGx5IGFwcGVhciBpbiB0aGUgc2VsZWN0aW9uIG5vcm1hbGx5LlxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5nZXRCZXN0Q29zdE5vZGVTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICBpZiAodHlwZW9mIHRoaXMucm93TW9kZWwuZ2V0VG9wTGV2ZWxOb2RlcyAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHRocm93ICdzZWxlY3RBbGwgbm90IGF2YWlsYWJsZSB3aGVuIHJvd3MgYXJlIG9uIHRoZSBzZXJ2ZXInO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0b3BMZXZlbE5vZGVzID0gdGhpcy5yb3dNb2RlbC5nZXRUb3BMZXZlbE5vZGVzKCk7XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIC8vIHJlY3Vyc2l2ZSBmdW5jdGlvbiwgdG8gZmluZCB0aGUgc2VsZWN0ZWQgbm9kZXNcclxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG5vZGVzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgICAgICAgaWYgKHRoYXQuaXNOb2RlU2VsZWN0ZWQobm9kZSkpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgbm90IHNlbGVjdGVkLCB0aGVuIGlmIGl0J3MgYSBncm91cCwgYW5kIHRoZSBncm91cFxyXG4gICAgICAgICAgICAgICAgLy8gaGFzIGNoaWxkcmVuLCBjb250aW51ZSB0byBzZWFyY2ggZm9yIHNlbGVjdGlvbnNcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZShub2RlLmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0cmF2ZXJzZSh0b3BMZXZlbE5vZGVzKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuc2V0Um93TW9kZWwgPSBmdW5jdGlvbihyb3dNb2RlbCkge1xyXG4gICAgdGhpcy5yb3dNb2RlbCA9IHJvd01vZGVsO1xyXG59O1xyXG5cclxuLy8gcHVibGljIC0gdGhpcyBjbGVhcnMgdGhlIHNlbGVjdGlvbiwgYnV0IGRvZXNuJ3QgY2xlYXIgZG93biB0aGUgY3NzIC0gd2hlbiBpdCBpcyBjYWxsZWQsIHRoZVxyXG4vLyBjYWxsZXIgdGhlbiBnZXRzIHRoZSBncmlkIHRvIHJlZnJlc2guXHJcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0QWxsID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmluaXRTZWxlY3RlZE5vZGVzQnlJZCgpO1xyXG4gICAgLy92YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xyXG4gICAgLy9mb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgIC8vICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW2tleXNbaV1dO1xyXG4gICAgLy99XHJcbiAgICB0aGlzLnN5bmNTZWxlY3RlZFJvd3NBbmRDYWxsTGlzdGVuZXIoKTtcclxufTtcclxuXHJcbi8vIHB1YmxpYyAtIHRoaXMgc2VsZWN0cyBldmVyeXRoaW5nLCBidXQgZG9lc24ndCBjbGVhciBkb3duIHRoZSBjc3MgLSB3aGVuIGl0IGlzIGNhbGxlZCwgdGhlXHJcbi8vIGNhbGxlciB0aGVuIGdldHMgdGhlIGdyaWQgdG8gcmVmcmVzaC5cclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuc2VsZWN0QWxsID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJvd01vZGVsLmdldFRvcExldmVsTm9kZXMgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICB0aHJvdyAnc2VsZWN0QWxsIG5vdCBhdmFpbGFibGUgd2hlbiByb3dzIGFyZSBvbiB0aGUgc2VydmVyJztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc2VsZWN0ZWROb2Rlc0J5SWQgPSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkO1xyXG4gICAgLy8gaWYgdGhlIHNlbGVjdGlvbiBpcyBcImRvbid0IGluY2x1ZGUgZ3JvdXBzXCIsIHRoZW4gd2UgZG9uJ3QgaW5jbHVkZSB0aGVtIVxyXG4gICAgdmFyIGluY2x1ZGVHcm91cHMgPSAhdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFNlbGVjdHNDaGlsZHJlbigpO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5U2VsZWN0KG5vZGVzKSB7XHJcbiAgICAgICAgaWYgKG5vZGVzKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpPG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuZ3JvdXApIHtcclxuICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmVseVNlbGVjdChub2RlLmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUdyb3Vwcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVzQnlJZFtub2RlLmlkXSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZE5vZGVzQnlJZFtub2RlLmlkXSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRvcExldmVsTm9kZXMgPSB0aGlzLnJvd01vZGVsLmdldFRvcExldmVsTm9kZXMoKTtcclxuICAgIHJlY3Vyc2l2ZWx5U2VsZWN0KHRvcExldmVsTm9kZXMpO1xyXG5cclxuICAgIHRoaXMuc3luY1NlbGVjdGVkUm93c0FuZENhbGxMaXN0ZW5lcigpO1xyXG59O1xyXG5cclxuLy8gcHVibGljXHJcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnNlbGVjdE5vZGUgPSBmdW5jdGlvbihub2RlLCB0cnlNdWx0aSwgc3VwcHJlc3NFdmVudHMpIHtcclxuICAgIHZhciBtdWx0aVNlbGVjdCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93U2VsZWN0aW9uTXVsdGkoKSAmJiB0cnlNdWx0aTtcclxuXHJcbiAgICAvLyBpZiB0aGUgbm9kZSBpcyBhIGdyb3VwLCB0aGVuIHNlbGVjdGluZyB0aGlzIGlzIHRoZSBzYW1lIGFzIHNlbGVjdGluZyB0aGUgcGFyZW50LFxyXG4gICAgLy8gc28gdG8gaGF2ZSBvbmx5IG9uZSBmbG93IHRocm91Z2ggdGhlIGJlbG93LCB3ZSBhbHdheXMgc2VsZWN0IHRoZSBoZWFkZXIgcGFyZW50XHJcbiAgICAvLyAod2hpY2ggdGhlbiBoYXMgdGhlIHNpZGUgZWZmZWN0IG9mIHNlbGVjdGluZyB0aGUgY2hpbGQpLlxyXG4gICAgdmFyIG5vZGVUb1NlbGVjdDtcclxuICAgIGlmIChub2RlLmZvb3Rlcikge1xyXG4gICAgICAgIG5vZGVUb1NlbGVjdCA9IG5vZGUuc2libGluZztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbm9kZVRvU2VsZWN0ID0gbm9kZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhdCB0aGUgZW5kLCBpZiB0aGlzIGlzIHRydWUsIHdlIGluZm9ybSB0aGUgY2FsbGJhY2tcclxuICAgIHZhciBhdExlYXN0T25lSXRlbVVuc2VsZWN0ZWQgPSBmYWxzZTtcclxuICAgIHZhciBhdExlYXN0T25lSXRlbVNlbGVjdGVkID0gZmFsc2U7XHJcblxyXG4gICAgLy8gc2VlIGlmIHJvd3MgdG8gYmUgZGVzZWxlY3RlZFxyXG4gICAgaWYgKCFtdWx0aVNlbGVjdCkge1xyXG4gICAgICAgIGF0TGVhc3RPbmVJdGVtVW5zZWxlY3RlZCA9IHRoaXMuZG9Xb3JrT2ZEZXNlbGVjdEFsbE5vZGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBTZWxlY3RzQ2hpbGRyZW4oKSAmJiBub2RlVG9TZWxlY3QuZ3JvdXApIHtcclxuICAgICAgICAvLyBkb24ndCBzZWxlY3QgdGhlIGdyb3VwLCBzZWxlY3QgdGhlIGNoaWxkcmVuIGluc3RlYWRcclxuICAgICAgICBhdExlYXN0T25lSXRlbVNlbGVjdGVkID0gdGhpcy5yZWN1cnNpdmVseVNlbGVjdEFsbENoaWxkcmVuKG5vZGVUb1NlbGVjdCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNlZSBpZiByb3cgbmVlZHMgdG8gYmUgc2VsZWN0ZWRcclxuICAgICAgICBhdExlYXN0T25lSXRlbVNlbGVjdGVkID0gdGhpcy5kb1dvcmtPZlNlbGVjdE5vZGUobm9kZVRvU2VsZWN0LCBzdXBwcmVzc0V2ZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGF0TGVhc3RPbmVJdGVtVW5zZWxlY3RlZCB8fCBhdExlYXN0T25lSXRlbVNlbGVjdGVkKSB7XHJcbiAgICAgICAgdGhpcy5zeW5jU2VsZWN0ZWRSb3dzQW5kQ2FsbExpc3RlbmVyKHN1cHByZXNzRXZlbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVwZGF0ZUdyb3VwUGFyZW50c0lmTmVlZGVkKCk7XHJcbn07XHJcblxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseVNlbGVjdEFsbENoaWxkcmVuID0gZnVuY3Rpb24obm9kZSwgc3VwcHJlc3NFdmVudHMpIHtcclxuICAgIHZhciBhdExlYXN0T25lID0gZmFsc2U7XHJcbiAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBub2RlLmNoaWxkcmVuW2ldO1xyXG4gICAgICAgICAgICBpZiAoY2hpbGQuZ3JvdXApIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlY3Vyc2l2ZWx5U2VsZWN0QWxsQ2hpbGRyZW4oY2hpbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXRMZWFzdE9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kb1dvcmtPZlNlbGVjdE5vZGUoY2hpbGQsIHN1cHByZXNzRXZlbnRzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0TGVhc3RPbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGF0TGVhc3RPbmU7XHJcbn07XHJcblxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseURlc2VsZWN0QWxsQ2hpbGRyZW4gPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBub2RlLmNoaWxkcmVuW2ldO1xyXG4gICAgICAgICAgICBpZiAoY2hpbGQuZ3JvdXApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlEZXNlbGVjdEFsbENoaWxkcmVuKGNoaWxkKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzZWxlY3RSZWFsTm9kZShjaGlsZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbi8vIDEgLSBzZWxlY3RzIGEgbm9kZVxyXG4vLyAyIC0gdXBkYXRlcyB0aGUgVUlcclxuLy8gMyAtIGNhbGxzIGNhbGxiYWNrc1xyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5kb1dvcmtPZlNlbGVjdE5vZGUgPSBmdW5jdGlvbihub2RlLCBzdXBwcmVzc0V2ZW50cykge1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWRbbm9kZS5pZF0pIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtub2RlLmlkXSA9IG5vZGU7XHJcblxyXG4gICAgdGhpcy5hZGRDc3NDbGFzc0Zvck5vZGVfYW5kSW5mb3JtVmlydHVhbFJvd0xpc3RlbmVyKG5vZGUpO1xyXG5cclxuICAgIC8vIGFsc28gY29sb3IgaW4gdGhlIGZvb3RlciBpZiB0aGVyZSBpcyBvbmVcclxuICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuZXhwYW5kZWQgJiYgbm9kZS5zaWJsaW5nKSB7XHJcbiAgICAgICAgdGhpcy5hZGRDc3NDbGFzc0Zvck5vZGVfYW5kSW5mb3JtVmlydHVhbFJvd0xpc3RlbmVyKG5vZGUuc2libGluZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaW5mb3JtIHRoZSByb3dTZWxlY3RlZCBsaXN0ZW5lciwgaWYgYW55XHJcbiAgICBpZiAoIXN1cHByZXNzRXZlbnRzICYmIHR5cGVvZiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dTZWxlY3RlZCgpID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dTZWxlY3RlZCgpKG5vZGUuZGF0YSwgbm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcbi8vIDEgLSBzZWxlY3RzIGEgbm9kZVxyXG4vLyAyIC0gdXBkYXRlcyB0aGUgVUlcclxuLy8gMyAtIGNhbGxzIGNhbGxiYWNrc1xyXG4vLyB3b3cgLSB3aGF0IGEgYmlnIG5hbWUgZm9yIGEgbWV0aG9kLCBleGNlcHRpb24gY2FzZSwgaXQncyBzYXlpbmcgd2hhdCB0aGUgbWV0aG9kIGRvZXNcclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuYWRkQ3NzQ2xhc3NGb3JOb2RlX2FuZEluZm9ybVZpcnR1YWxSb3dMaXN0ZW5lciA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIHZhciB2aXJ0dWFsUmVuZGVyZWRSb3dJbmRleCA9IHRoaXMucm93UmVuZGVyZXIuZ2V0SW5kZXhPZlJlbmRlcmVkTm9kZShub2RlKTtcclxuICAgIGlmICh2aXJ0dWFsUmVuZGVyZWRSb3dJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9hZGRDc3NDbGFzcyh0aGlzLmVSb3dzUGFyZW50LCAnW3Jvdz1cIicgKyB2aXJ0dWFsUmVuZGVyZWRSb3dJbmRleCArICdcIl0nLCAnYWctcm93LXNlbGVjdGVkJyk7XHJcblxyXG4gICAgICAgIC8vIGluZm9ybSB2aXJ0dWFsIHJvdyBsaXN0ZW5lclxyXG4gICAgICAgIHRoaXMuYW5ndWxhckdyaWQub25WaXJ0dWFsUm93U2VsZWN0ZWQodmlydHVhbFJlbmRlcmVkUm93SW5kZXgsIHRydWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG4vLyAxIC0gdW4tc2VsZWN0cyBhIG5vZGVcclxuLy8gMiAtIHVwZGF0ZXMgdGhlIFVJXHJcbi8vIDMgLSBjYWxscyBjYWxsYmFja3NcclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuZG9Xb3JrT2ZEZXNlbGVjdEFsbE5vZGVzID0gZnVuY3Rpb24obm9kZVRvS2VlcFNlbGVjdGVkKSB7XHJcbiAgICAvLyBub3QgZG9pbmcgbXVsdGktc2VsZWN0LCBzbyBkZXNlbGVjdCBldmVyeXRoaW5nIG90aGVyIHRoYW4gdGhlICdqdXN0IHNlbGVjdGVkJyByb3dcclxuICAgIHZhciBhdExlYXN0T25lU2VsZWN0aW9uQ2hhbmdlO1xyXG4gICAgdmFyIHNlbGVjdGVkTm9kZUtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNlbGVjdGVkTm9kZXNCeUlkKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWROb2RlS2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIC8vIHNraXAgdGhlICdqdXN0IHNlbGVjdGVkJyByb3dcclxuICAgICAgICB2YXIga2V5ID0gc2VsZWN0ZWROb2RlS2V5c1tpXTtcclxuICAgICAgICB2YXIgbm9kZVRvRGVzZWxlY3QgPSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW2tleV07XHJcbiAgICAgICAgaWYgKG5vZGVUb0Rlc2VsZWN0ID09PSBub2RlVG9LZWVwU2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5kZXNlbGVjdFJlYWxOb2RlKG5vZGVUb0Rlc2VsZWN0KTtcclxuICAgICAgICAgICAgYXRMZWFzdE9uZVNlbGVjdGlvbkNoYW5nZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGF0TGVhc3RPbmVTZWxlY3Rpb25DaGFuZ2U7XHJcbn07XHJcblxyXG4vLyBwcml2YXRlXHJcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0UmVhbE5vZGUgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAvLyBkZXNlbGVjdCB0aGUgY3NzXHJcbiAgICB0aGlzLnJlbW92ZUNzc0NsYXNzRm9yTm9kZShub2RlKTtcclxuXHJcbiAgICAvLyBpZiBub2RlIGlzIGEgaGVhZGVyLCBhbmQgaWYgaXQgaGFzIGEgc2libGluZyBmb290ZXIsIGRlc2VsZWN0IHRoZSBmb290ZXIgYWxzb1xyXG4gICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5leHBhbmRlZCAmJiBub2RlLnNpYmxpbmcpIHsgLy8gYWxzbyBjaGVjayB0aGF0IGl0J3MgZXhwYW5kZWQsIGFzIHNpYmxpbmcgY291bGQgYmUgYSBnaG9zdFxyXG4gICAgICAgIHRoaXMucmVtb3ZlQ3NzQ2xhc3NGb3JOb2RlKG5vZGUuc2libGluZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVtb3ZlIHRoZSByb3dcclxuICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW25vZGUuaWRdO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVDc3NDbGFzc0Zvck5vZGUgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgdmlydHVhbFJlbmRlcmVkUm93SW5kZXggPSB0aGlzLnJvd1JlbmRlcmVyLmdldEluZGV4T2ZSZW5kZXJlZE5vZGUobm9kZSk7XHJcbiAgICBpZiAodmlydHVhbFJlbmRlcmVkUm93SW5kZXggPj0gMCkge1xyXG4gICAgICAgIHV0aWxzLnF1ZXJ5U2VsZWN0b3JBbGxfcmVtb3ZlQ3NzQ2xhc3ModGhpcy5lUm93c1BhcmVudCwgJ1tyb3c9XCInICsgdmlydHVhbFJlbmRlcmVkUm93SW5kZXggKyAnXCJdJywgJ2FnLXJvdy1zZWxlY3RlZCcpO1xyXG4gICAgICAgIC8vIGluZm9ybSB2aXJ0dWFsIHJvdyBsaXN0ZW5lclxyXG4gICAgICAgIHRoaXMuYW5ndWxhckdyaWQub25WaXJ0dWFsUm93U2VsZWN0ZWQodmlydHVhbFJlbmRlcmVkUm93SW5kZXgsIGZhbHNlKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHB1YmxpYyAoc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KVxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5kZXNlbGVjdEluZGV4ID0gZnVuY3Rpb24ocm93SW5kZXgpIHtcclxuICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KHJvd0luZGV4KTtcclxuICAgIHRoaXMuZGVzZWxlY3ROb2RlKG5vZGUpO1xyXG59O1xyXG5cclxuLy8gcHVibGljIChhcGkpXHJcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0Tm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBTZWxlY3RzQ2hpbGRyZW4oKSAmJiBub2RlLmdyb3VwKSB7XHJcbiAgICAgICAgICAgIC8vIHdhbnQgdG8gZGVzZWxlY3QgY2hpbGRyZW4sIG5vdCB0aGlzIG5vZGUsIHNvIHJlY3Vyc2l2ZWx5IGRlc2VsZWN0XHJcbiAgICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlEZXNlbGVjdEFsbENoaWxkcmVuKG5vZGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzZWxlY3RSZWFsTm9kZShub2RlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLnN5bmNTZWxlY3RlZFJvd3NBbmRDYWxsTGlzdGVuZXIoKTtcclxuICAgIHRoaXMudXBkYXRlR3JvdXBQYXJlbnRzSWZOZWVkZWQoKTtcclxufTtcclxuXHJcbi8vIHB1YmxpYyAoc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5ICYgYXBpKVxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5zZWxlY3RJbmRleCA9IGZ1bmN0aW9uKGluZGV4LCB0cnlNdWx0aSwgc3VwcHJlc3NFdmVudHMpIHtcclxuICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KGluZGV4KTtcclxuICAgIHRoaXMuc2VsZWN0Tm9kZShub2RlLCB0cnlNdWx0aSwgc3VwcHJlc3NFdmVudHMpO1xyXG59O1xyXG5cclxuLy8gcHJpdmF0ZVxyXG4vLyB1cGRhdGVzIHRoZSBzZWxlY3RlZFJvd3Mgd2l0aCB0aGUgc2VsZWN0ZWROb2RlcyBhbmQgY2FsbHMgc2VsZWN0aW9uQ2hhbmdlZCBsaXN0ZW5lclxyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5zeW5jU2VsZWN0ZWRSb3dzQW5kQ2FsbExpc3RlbmVyID0gZnVuY3Rpb24oc3VwcHJlc3NFdmVudHMpIHtcclxuICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCByb3dzXHJcbiAgICB2YXIgc2VsZWN0ZWRSb3dzID0gdGhpcy5zZWxlY3RlZFJvd3M7XHJcbiAgICB2YXIgb2xkQ291bnQgPSBzZWxlY3RlZFJvd3MubGVuZ3RoO1xyXG4gICAgLy8gY2xlYXIgc2VsZWN0ZWQgcm93c1xyXG4gICAgc2VsZWN0ZWRSb3dzLmxlbmd0aCA9IDA7XHJcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWRba2V5c1tpXV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWROb2RlID0gdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtrZXlzW2ldXTtcclxuICAgICAgICAgICAgc2VsZWN0ZWRSb3dzLnB1c2goc2VsZWN0ZWROb2RlLmRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGlzIHN0b3BlIHRoZSBldmVudCBmaXJpbmcgdGhlIHZlcnkgZmlyc3QgdGhlIHRpbWUgZ3JpZCBpcyBpbml0aWFsaXNlZC4gd2l0aG91dCB0aGlzLCB0aGUgZG9jdW1lbnRhdGlvblxyXG4gICAgLy8gcGFnZSBoYWQgYSBwb3B1cCBpbiB0aGUgJ3NlbGVjdGlvbicgcGFnZSBhcyBzb29uIGFzIHRoZSBwYWdlIHdhcyBsb2FkZWQhIVxyXG4gICAgdmFyIG5vdGhpbmdDaGFuZ2VkTXVzdEJlSW5pdGlhbGlzaW5nID0gb2xkQ291bnQgPT09IDAgJiYgc2VsZWN0ZWRSb3dzLmxlbmd0aCA9PT0gMDtcclxuXHJcbiAgICBpZiAoIW5vdGhpbmdDaGFuZ2VkTXVzdEJlSW5pdGlhbGlzaW5nICYmICFzdXBwcmVzc0V2ZW50cyAmJiB0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0U2VsZWN0aW9uQ2hhbmdlZCgpID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRTZWxlY3Rpb25DaGFuZ2VkKCkoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBpZiAodGhpcy4kc2NvcGUpIHtcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGF0LiRzY29wZS4kYXBwbHkoKTtcclxuICAgICAgICB9LCAwKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHByaXZhdGVcclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUucmVjdXJzaXZlbHlDaGVja0lmU2VsZWN0ZWQgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICB2YXIgZm91bmRTZWxlY3RlZCA9IGZhbHNlO1xyXG4gICAgdmFyIGZvdW5kVW5zZWxlY3RlZCA9IGZhbHNlO1xyXG5cclxuICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IG5vZGUuY2hpbGRyZW5baV07XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XHJcbiAgICAgICAgICAgIGlmIChjaGlsZC5ncm91cCkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5yZWN1cnNpdmVseUNoZWNrSWZTZWxlY3RlZChjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU0VMRUNURUQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kU2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFVOU0VMRUNURUQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVW5zZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTUlYRUQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kU2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFVuc2VsZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgY2FuIGlnbm9yZSB0aGUgRE9fTk9UX0NBUkUsIGFzIGl0IGRvZXNuJ3QgaW1wYWN0LCBtZWFucyB0aGUgY2hpbGRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFzIG5vIGNoaWxkcmVuIGFuZCBzaG91bGRuJ3QgYmUgY29uc2lkZXJlZCB3aGVuIGRlY2lkaW5nXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc05vZGVTZWxlY3RlZChjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZFNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmRVbnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGZvdW5kU2VsZWN0ZWQgJiYgZm91bmRVbnNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZiBtaXhlZCwgdGhlbiBubyBuZWVkIHRvIGdvIGZ1cnRoZXIsIGp1c3QgcmV0dXJuIHVwIHRoZSBjaGFpblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1JWEVEO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGdvdCB0aGlzIGZhciwgc28gbm8gY29uZmxpY3RzLCBlaXRoZXIgYWxsIGNoaWxkcmVuIHNlbGVjdGVkLCB1bnNlbGVjdGVkLCBvciBuZWl0aGVyXHJcbiAgICBpZiAoZm91bmRTZWxlY3RlZCkge1xyXG4gICAgICAgIHJldHVybiBTRUxFQ1RFRDtcclxuICAgIH0gZWxzZSBpZiAoZm91bmRVbnNlbGVjdGVkKSB7XHJcbiAgICAgICAgcmV0dXJuIFVOU0VMRUNURUQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBET19OT1RfQ0FSRTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHB1YmxpYyAoc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KVxyXG4vLyByZXR1cm5zOlxyXG4vLyB0cnVlOiBpZiBzZWxlY3RlZFxyXG4vLyBmYWxzZTogaWYgdW5zZWxlY3RlZFxyXG4vLyB1bmRlZmluZWQ6IGlmIGl0J3MgYSBncm91cCBhbmQgJ2NoaWxkcmVuIHNlbGVjdGlvbicgaXMgdXNlZCBhbmQgJ2NoaWxkcmVuJyBhcmUgYSBtaXggb2Ygc2VsZWN0ZWQgYW5kIHVuc2VsZWN0ZWRcclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuaXNOb2RlU2VsZWN0ZWQgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFNlbGVjdHNDaGlsZHJlbigpICYmIG5vZGUuZ3JvdXApIHtcclxuICAgICAgICAvLyBkb2luZyBjaGlsZCBzZWxlY3Rpb24sIHdlIG5lZWQgdG8gdHJhdmVyc2UgdGhlIGNoaWxkcmVuXHJcbiAgICAgICAgdmFyIHJlc3VsdE9mQ2hpbGRyZW4gPSB0aGlzLnJlY3Vyc2l2ZWx5Q2hlY2tJZlNlbGVjdGVkKG5vZGUpO1xyXG4gICAgICAgIHN3aXRjaCAocmVzdWx0T2ZDaGlsZHJlbikge1xyXG4gICAgICAgICAgICBjYXNlIFNFTEVDVEVEOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIGNhc2UgVU5TRUxFQ1RFRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtub2RlLmlkXSAhPT0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlR3JvdXBQYXJlbnRzSWZOZWVkZWQgPSBmdW5jdGlvbigpIHtcclxuICAgIC8vIHdlIG9ubHkgZG8gdGhpcyBpZiBwYXJlbnQgbm9kZXMgYXJlIHJlc3BvbnNpYmxlXHJcbiAgICAvLyBmb3Igc2VsZWN0aW5nIHRoZWlyIGNoaWxkcmVuLlxyXG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwU2VsZWN0c0NoaWxkcmVuKCkpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZpcnN0Um93ID0gdGhpcy5yb3dSZW5kZXJlci5nZXRGaXJzdFZpcnR1YWxSZW5kZXJlZFJvdygpO1xyXG4gICAgdmFyIGxhc3RSb3cgPSB0aGlzLnJvd1JlbmRlcmVyLmdldExhc3RWaXJ0dWFsUmVuZGVyZWRSb3coKTtcclxuICAgIGZvciAodmFyIHJvd0luZGV4ID0gZmlyc3RSb3c7IHJvd0luZGV4IDw9IGxhc3RSb3c7IHJvd0luZGV4KyspIHtcclxuICAgICAgICAvLyBzZWUgaWYgbm9kZSBpcyBhIGdyb3VwXHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnJvd01vZGVsLmdldFZpcnR1YWxSb3cocm93SW5kZXgpO1xyXG4gICAgICAgIGlmIChub2RlLmdyb3VwKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9IHRoaXMuaXNOb2RlU2VsZWN0ZWQobm9kZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYW5ndWxhckdyaWQub25WaXJ0dWFsUm93U2VsZWN0ZWQocm93SW5kZXgsIHNlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9hZGRDc3NDbGFzcyh0aGlzLmVSb3dzUGFyZW50LCAnW3Jvdz1cIicgKyByb3dJbmRleCArICdcIl0nLCAnYWctcm93LXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB1dGlscy5xdWVyeVNlbGVjdG9yQWxsX3JlbW92ZUNzc0NsYXNzKHRoaXMuZVJvd3NQYXJlbnQsICdbcm93PVwiJyArIHJvd0luZGV4ICsgJ1wiXScsICdhZy1yb3ctc2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0aW9uQ29udHJvbGxlcjtcclxuIiwiZnVuY3Rpb24gU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KCkge31cclxuXHJcblNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGFuZ3VsYXJHcmlkLCBzZWxlY3Rpb25Db250cm9sbGVyKSB7XHJcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XHJcbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIgPSBzZWxlY3Rpb25Db250cm9sbGVyO1xyXG59O1xyXG5cclxuU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVDaGVja2JveENvbERlZiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB3aWR0aDogMzAsXHJcbiAgICAgICAgc3VwcHJlc3NNZW51OiB0cnVlLFxyXG4gICAgICAgIHN1cHByZXNzU29ydGluZzogdHJ1ZSxcclxuICAgICAgICBoZWFkZXJDZWxsUmVuZGVyZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZUNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICAgICAgZUNoZWNrYm94LnR5cGUgPSAnY2hlY2tib3gnO1xyXG4gICAgICAgICAgICBlQ2hlY2tib3gubmFtZSA9ICduYW1lJztcclxuICAgICAgICAgICAgcmV0dXJuIGVDaGVja2JveDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNlbGxSZW5kZXJlcjogdGhpcy5jcmVhdGVDaGVja2JveFJlbmRlcmVyKClcclxuICAgIH07XHJcbn07XHJcblxyXG5TZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUNoZWNrYm94UmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbihwYXJhbXMpIHtcclxuICAgICAgICByZXR1cm4gdGhhdC5jcmVhdGVTZWxlY3Rpb25DaGVja2JveChwYXJhbXMubm9kZSwgcGFyYW1zLnJvd0luZGV4KTtcclxuICAgIH07XHJcbn07XHJcblxyXG5TZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZVNlbGVjdGlvbkNoZWNrYm94ID0gZnVuY3Rpb24obm9kZSwgcm93SW5kZXgpIHtcclxuXHJcbiAgICB2YXIgZUNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgIGVDaGVja2JveC50eXBlID0gXCJjaGVja2JveFwiO1xyXG4gICAgZUNoZWNrYm94Lm5hbWUgPSBcIm5hbWVcIjtcclxuICAgIGVDaGVja2JveC5jbGFzc05hbWUgPSAnYWctc2VsZWN0aW9uLWNoZWNrYm94JztcclxuICAgIHNldENoZWNrYm94U3RhdGUoZUNoZWNrYm94LCB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIuaXNOb2RlU2VsZWN0ZWQobm9kZSkpO1xyXG5cclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGVDaGVja2JveC5vbmNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIH07XHJcblxyXG4gICAgZUNoZWNrYm94Lm9uY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gZUNoZWNrYm94LmNoZWNrZWQ7XHJcbiAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5zZWxlY3RJbmRleChyb3dJbmRleCwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLmRlc2VsZWN0SW5kZXgocm93SW5kZXgpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5hZGRWaXJ0dWFsUm93TGlzdGVuZXIocm93SW5kZXgsIHtcclxuICAgICAgICByb3dTZWxlY3RlZDogZnVuY3Rpb24oc2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgc2V0Q2hlY2tib3hTdGF0ZShlQ2hlY2tib3gsIHNlbGVjdGVkKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJvd1JlbW92ZWQ6IGZ1bmN0aW9uKCkge31cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlQ2hlY2tib3g7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBzZXRDaGVja2JveFN0YXRlKGVDaGVja2JveCwgc3RhdGUpIHtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09ICdib29sZWFuJykge1xyXG4gICAgICAgIGVDaGVja2JveC5jaGVja2VkID0gc3RhdGU7XHJcbiAgICAgICAgZUNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gaXNOb2RlU2VsZWN0ZWQgcmV0dXJucyBiYWNrIHVuZGVmaW5lZCBpZiBpdCdzIGEgZ3JvdXAgYW5kIHRoZSBjaGlsZHJlblxyXG4gICAgICAgIC8vIGFyZSBhIG1peCBvZiBzZWxlY3RlZCBhbmQgdW5zZWxlY3RlZFxyXG4gICAgICAgIGVDaGVja2JveC5pbmRldGVybWluYXRlID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rpb25SZW5kZXJlckZhY3Rvcnk7XHJcbiIsInZhciBTVkdfTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG5mdW5jdGlvbiBTdmdGYWN0b3J5KCkge31cclxuXHJcblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUZpbHRlclN2ZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGVTdmcgPSBjcmVhdGVJY29uU3ZnKCk7XHJcblxyXG4gICAgdmFyIGVGdW5uZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05TLCBcInBvbHlnb25cIik7XHJcbiAgICBlRnVubmVsLnNldEF0dHJpYnV0ZShcInBvaW50c1wiLCBcIjAsMCA0LDQgNCwxMCA2LDEwIDYsNCAxMCwwXCIpO1xyXG4gICAgZUZ1bm5lbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcImFnLWhlYWRlci1pY29uXCIpO1xyXG4gICAgZVN2Zy5hcHBlbmRDaGlsZChlRnVubmVsKTtcclxuXHJcbiAgICByZXR1cm4gZVN2ZztcclxufTtcclxuXHJcblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUNvbHVtblNob3dpbmdTdmcgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBjcmVhdGVDaXJjbGUodHJ1ZSk7XHJcbn07XHJcblxyXG5TdmdGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVDb2x1bW5IaWRkZW5TdmcgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBjcmVhdGVDaXJjbGUoZmFsc2UpO1xyXG59O1xyXG5cclxuU3ZnRmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlTWVudVN2ZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGVTdmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05TLCBcInN2Z1wiKTtcclxuICAgIHZhciBzaXplID0gXCIxMlwiO1xyXG4gICAgZVN2Zy5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBzaXplKTtcclxuICAgIGVTdmcuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIHNpemUpO1xyXG5cclxuICAgIFtcIjBcIiwgXCI1XCIsIFwiMTBcIl0uZm9yRWFjaChmdW5jdGlvbih5KSB7XHJcbiAgICAgICAgdmFyIGVMaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OUywgXCJyZWN0XCIpO1xyXG4gICAgICAgIGVMaW5lLnNldEF0dHJpYnV0ZShcInlcIiwgeSk7XHJcbiAgICAgICAgZUxpbmUuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgc2l6ZSk7XHJcbiAgICAgICAgZUxpbmUuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFwiMlwiKTtcclxuICAgICAgICBlTGluZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcImFnLWhlYWRlci1pY29uXCIpO1xyXG4gICAgICAgIGVTdmcuYXBwZW5kQ2hpbGQoZUxpbmUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVTdmc7XHJcbn07XHJcblxyXG5TdmdGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVBcnJvd1VwU3ZnID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjAsMTAgNSwwIDEwLDEwXCIpO1xyXG59O1xyXG5cclxuU3ZnRmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlQXJyb3dMZWZ0U3ZnID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjEwLDAgMCw1IDEwLDEwXCIpO1xyXG59O1xyXG5cclxuU3ZnRmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlQXJyb3dEb3duU3ZnID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjAsMCA1LDEwIDEwLDBcIik7XHJcbn07XHJcblxyXG5TdmdGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVBcnJvd1JpZ2h0U3ZnID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjAsMCAxMCw1IDAsMTBcIik7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQb2x5Z29uU3ZnKHBvaW50cykge1xyXG4gICAgdmFyIGVTdmcgPSBjcmVhdGVJY29uU3ZnKCk7XHJcblxyXG4gICAgdmFyIGVEZXNjSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTlMsIFwicG9seWdvblwiKTtcclxuICAgIGVEZXNjSWNvbi5zZXRBdHRyaWJ1dGUoXCJwb2ludHNcIiwgcG9pbnRzKTtcclxuICAgIGVTdmcuYXBwZW5kQ2hpbGQoZURlc2NJY29uKTtcclxuXHJcbiAgICByZXR1cm4gZVN2ZztcclxufVxyXG5cclxuLy8gdXRpbCBmdW5jdGlvbiBmb3IgdGhlIGFib3ZlXHJcbmZ1bmN0aW9uIGNyZWF0ZUljb25TdmcoKSB7XHJcbiAgICB2YXIgZVN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTlMsIFwic3ZnXCIpO1xyXG4gICAgZVN2Zy5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBcIjEwXCIpO1xyXG4gICAgZVN2Zy5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgXCIxMFwiKTtcclxuICAgIHJldHVybiBlU3ZnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaXJjbGUoZmlsbCkge1xyXG4gICAgdmFyIGVTdmcgPSBjcmVhdGVJY29uU3ZnKCk7XHJcblxyXG4gICAgdmFyIGVDaXJjbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05TLCBcImNpcmNsZVwiKTtcclxuICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwiY3hcIiwgXCI1XCIpO1xyXG4gICAgZUNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJjeVwiLCBcIjVcIik7XHJcbiAgICBlQ2lyY2xlLnNldEF0dHJpYnV0ZShcInJcIiwgXCI1XCIpO1xyXG4gICAgZUNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJzdHJva2VcIiwgXCJibGFja1wiKTtcclxuICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMlwiKTtcclxuICAgIGlmIChmaWxsKSB7XHJcbiAgICAgICAgZUNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJmaWxsXCIsIFwiYmxhY2tcIik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwiZmlsbFwiLCBcIm5vbmVcIik7XHJcbiAgICB9XHJcbiAgICBlU3ZnLmFwcGVuZENoaWxkKGVDaXJjbGUpO1xyXG5cclxuICAgIHJldHVybiBlU3ZnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdmdGYWN0b3J5O1xyXG4iLCJcclxuZnVuY3Rpb24gVGVtcGxhdGVTZXJ2aWNlKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZUNhY2hlID0ge307XHJcbiAgICB0aGlzLndhaXRpbmdDYWxsYmFja3MgPSB7fTtcclxufVxyXG5cclxuVGVtcGxhdGVTZXJ2aWNlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCRzY29wZSkge1xyXG4gICAgdGhpcy4kc2NvcGUgPSAkc2NvcGU7XHJcbn07XHJcblxyXG4vLyByZXR1cm5zIHRoZSB0ZW1wbGF0ZSBpZiBpdCBpcyBsb2FkZWQsIG9yIG51bGwgaWYgaXQgaXMgbm90IGxvYWRlZFxyXG4vLyBidXQgd2lsbCBjYWxsIHRoZSBjYWxsYmFjayB3aGVuIGl0IGlzIGxvYWRlZFxyXG5UZW1wbGF0ZVNlcnZpY2UucHJvdG90eXBlLmdldFRlbXBsYXRlID0gZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICB2YXIgdGVtcGxhdGVGcm9tQ2FjaGUgPSB0aGlzLnRlbXBsYXRlQ2FjaGVbdXJsXTtcclxuICAgIGlmICh0ZW1wbGF0ZUZyb21DYWNoZSkge1xyXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZUZyb21DYWNoZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY2FsbGJhY2tMaXN0ID0gdGhpcy53YWl0aW5nQ2FsbGJhY2tzW3VybF07XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbGxiYWNrTGlzdCkge1xyXG4gICAgICAgIC8vIGZpcnN0IHRpbWUgdGhpcyB3YXMgY2FsbGVkLCBzbyBuZWVkIGEgbmV3IGxpc3QgZm9yIGNhbGxiYWNrc1xyXG4gICAgICAgIGNhbGxiYWNrTGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMud2FpdGluZ0NhbGxiYWNrc1t1cmxdID0gY2FsbGJhY2tMaXN0O1xyXG4gICAgICAgIC8vIGFuZCBhbHNvIG5lZWQgdG8gZG8gdGhlIGh0dHAgcmVxdWVzdFxyXG4gICAgICAgIHZhciBjbGllbnQgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgICAgICBjbGllbnQub25sb2FkID0gZnVuY3Rpb24gKCkgeyB0aGF0LmhhbmRsZUh0dHBSZXN1bHQodGhpcywgdXJsKTsgfTtcclxuICAgICAgICBjbGllbnQub3BlbihcIkdFVFwiLCB1cmwpO1xyXG4gICAgICAgIGNsaWVudC5zZW5kKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWRkIHRoaXMgY2FsbGJhY2tcclxuICAgIGlmIChjYWxsYmFjaykge1xyXG4gICAgICAgIGNhbGxiYWNrTGlzdC5wdXNoKGNhbGxiYWNrKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjYWxsZXIgbmVlZHMgdG8gd2FpdCBmb3IgdGVtcGxhdGUgdG8gbG9hZCwgc28gcmV0dXJuIG51bGxcclxuICAgIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuVGVtcGxhdGVTZXJ2aWNlLnByb3RvdHlwZS5oYW5kbGVIdHRwUmVzdWx0ID0gZnVuY3Rpb24gKGh0dHBSZXN1bHQsIHVybCkge1xyXG5cclxuICAgIGlmIChodHRwUmVzdWx0LnN0YXR1cyAhPT0gMjAwIHx8IGh0dHBSZXN1bHQucmVzcG9uc2UgPT09IG51bGwpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBnZXQgdGVtcGxhdGUgZXJyb3IgJyArIGh0dHBSZXN1bHQuc3RhdHVzICsgJyAtICcgKyB1cmwpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZXNwb25zZSBzdWNjZXNzLCBzbyBwcm9jZXNzIGl0XHJcbiAgICB0aGlzLnRlbXBsYXRlQ2FjaGVbdXJsXSA9IGh0dHBSZXN1bHQucmVzcG9uc2U7XHJcblxyXG4gICAgLy8gaW5mb3JtIGFsbCBsaXN0ZW5lcnMgdGhhdCB0aGlzIGlzIG5vdyBpbiB0aGUgY2FjaGVcclxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLndhaXRpbmdDYWxsYmFja3NbdXJsXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gY2FsbGJhY2tzW2ldO1xyXG4gICAgICAgIC8vIHdlIGNvdWxkIHBhc3MgdGhlIGNhbGxiYWNrIHRoZSByZXNwb25zZSwgaG93ZXZlciB3ZSBrbm93IHRoZSBjbGllbnQgb2YgdGhpcyBjb2RlXHJcbiAgICAgICAgLy8gaXMgdGhlIGNlbGwgcmVuZGVyZXIsIGFuZCBpdCBwYXNzZXMgdGhlICdjZWxsUmVmcmVzaCcgbWV0aG9kIGluIGFzIHRoZSBjYWxsYmFja1xyXG4gICAgICAgIC8vIHdoaWNoIGRvZXNuJ3QgdGFrZSBhbnkgcGFyYW1ldGVycy5cclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLiRzY29wZSkge1xyXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGF0LiRzY29wZS4kYXBwbHkoKTtcclxuICAgICAgICB9LCAwKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVTZXJ2aWNlO1xyXG4iLCJ2YXIgQ2hlY2tib3hTZWxlY3Rpb24gPSByZXF1aXJlKFwiLi4vd2lkZ2V0cy9jaGVja2JveFNlbGVjdGlvblwiKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xyXG52YXIgQm9yZGVyTGF5b3V0ID0gcmVxdWlyZSgnLi4vbGF5b3V0L0JvcmRlckxheW91dCcpO1xyXG52YXIgU3ZnRmFjdG9yeSA9IHJlcXVpcmUoJy4uL3N2Z0ZhY3RvcnknKTtcclxuXHJcbnZhciBzdmdGYWN0b3J5ID0gbmV3IFN2Z0ZhY3RvcnkoKTtcclxuXHJcbmZ1bmN0aW9uIENvbHVtblNlbGVjdGlvblBhbmVsKGNvbHVtbkNvbnRyb2xsZXIsIGdyaWRPcHRpb25zV3JhcHBlcikge1xyXG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XHJcbiAgICB0aGlzLnNldHVwQ29tcG9uZW50cygpO1xyXG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyID0gY29sdW1uQ29udHJvbGxlcjtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIuYWRkTGlzdGVuZXIoe1xyXG4gICAgICAgIGNvbHVtbnNDaGFuZ2VkOiB0aGF0LmNvbHVtbnNDaGFuZ2VkLmJpbmQodGhhdClcclxuICAgIH0pO1xyXG59XHJcblxyXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuY29sdW1uc0NoYW5nZWQgPSBmdW5jdGlvbihuZXdDb2x1bW5zKSB7XHJcbiAgICB0aGlzLmNDb2x1bW5MaXN0LnNldE1vZGVsKG5ld0NvbHVtbnMpO1xyXG59O1xyXG5cclxuQ29sdW1uU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmdldENvbHVtbkxpc3QgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmNDb2x1bW5MaXN0O1xyXG59O1xyXG5cclxuQ29sdW1uU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmNvbHVtbkNlbGxSZW5kZXJlciA9IGZ1bmN0aW9uKHBhcmFtcykge1xyXG4gICAgdmFyIGNvbHVtbiA9IHBhcmFtcy52YWx1ZTtcclxuICAgIHZhciBjb2xEaXNwbGF5TmFtZSA9IHRoaXMuY29sdW1uQ29udHJvbGxlci5nZXREaXNwbGF5TmFtZUZvckNvbChjb2x1bW4pO1xyXG5cclxuICAgIHZhciBlUmVzdWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG5cclxuICAgIHZhciBlVmlzaWJsZUljb25zID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVZpc2libGVJY29ucywgJ2FnLXZpc2libGUtaWNvbnMnKTtcclxuICAgIHZhciBlU2hvd2luZyA9IHV0aWxzLmNyZWF0ZUljb24oJ2NvbHVtblZpc2libGUnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uLCBzdmdGYWN0b3J5LmNyZWF0ZUNvbHVtblNob3dpbmdTdmcpO1xyXG4gICAgdmFyIGVIaWRkZW4gPSB1dGlscy5jcmVhdGVJY29uKCdjb2x1bW5IaWRkZW4nLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgY29sdW1uLCBzdmdGYWN0b3J5LmNyZWF0ZUNvbHVtbkhpZGRlblN2Zyk7XHJcbiAgICBlVmlzaWJsZUljb25zLmFwcGVuZENoaWxkKGVTaG93aW5nKTtcclxuICAgIGVWaXNpYmxlSWNvbnMuYXBwZW5kQ2hpbGQoZUhpZGRlbik7XHJcbiAgICBlU2hvd2luZy5zdHlsZS5kaXNwbGF5ID0gY29sdW1uLnZpc2libGUgPyAnJyA6ICdub25lJztcclxuICAgIGVIaWRkZW4uc3R5bGUuZGlzcGxheSA9IGNvbHVtbi52aXNpYmxlID8gJ25vbmUnIDogJyc7XHJcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVWaXNpYmxlSWNvbnMpO1xyXG5cclxuICAgIHZhciBlVmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICBlVmFsdWUuaW5uZXJIVE1MID0gY29sRGlzcGxheU5hbWU7XHJcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVWYWx1ZSk7XHJcblxyXG4gICAgaWYgKCFjb2x1bW4udmlzaWJsZSkge1xyXG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGVSZXN1bHQsICdhZy1jb2x1bW4tbm90LXZpc2libGUnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGFuZ2UgdmlzaWJsZSBpZiB1c2UgY2xpY2tzIHRoZSB2aXNpYmxlIGljb24sIG9yIGlmIHJvdyBpcyBkb3VibGUgY2xpY2tlZFxyXG4gICAgZVZpc2libGVJY29ucy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNob3dFdmVudExpc3RlbmVyKTtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBmdW5jdGlvbiBzaG93RXZlbnRMaXN0ZW5lcigpIHtcclxuICAgICAgICBjb2x1bW4udmlzaWJsZSA9ICFjb2x1bW4udmlzaWJsZTtcclxuICAgICAgICB0aGF0LmNDb2x1bW5MaXN0LnJlZnJlc2hWaWV3KCk7XHJcbiAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLm9uQ29sdW1uU3RhdGVDaGFuZ2VkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVSZXN1bHQ7XHJcbn07XHJcblxyXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuc2V0dXBDb21wb25lbnRzID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgdGhpcy5jQ29sdW1uTGlzdCA9IG5ldyBDaGVja2JveFNlbGVjdGlvbigpO1xyXG4gICAgdGhpcy5jQ29sdW1uTGlzdC5zZXRDZWxsUmVuZGVyZXIodGhpcy5jb2x1bW5DZWxsUmVuZGVyZXIuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdGhpcy5jQ29sdW1uTGlzdC5hZGRNb2RlbENoYW5nZWRMaXN0ZW5lciggZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLm9uQ29sdW1uU3RhdGVDaGFuZ2VkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgbG9jYWxlVGV4dEZ1bmMgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRMb2NhbGVUZXh0RnVuYygpO1xyXG4gICAgdmFyIGNvbHVtbnNMb2NhbFRleHQgPSBsb2NhbGVUZXh0RnVuYygnY29sdW1ucycsICdDb2x1bW5zJyk7XHJcblxyXG4gICAgdmFyIGVOb3J0aFBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBlTm9ydGhQYW5lbC5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInRleHQtYWxpZ246IGNlbnRlcjtcIj4nK2NvbHVtbnNMb2NhbFRleHQrJzwvZGl2Pic7XHJcblxyXG4gICAgdGhpcy5sYXlvdXQgPSBuZXcgQm9yZGVyTGF5b3V0KHtcclxuICAgICAgICBjZW50ZXI6IHRoaXMuY0NvbHVtbkxpc3QuZ2V0R3VpKCksXHJcbiAgICAgICAgbm9ydGg6IGVOb3J0aFBhbmVsXHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8vIG5vdCBzdXJlIGlmIHRoaXMgaXMgY2FsbGVkIGFueXdoZXJlXHJcbkNvbHVtblNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5zZXRTZWxlY3RlZCA9IGZ1bmN0aW9uKGNvbHVtbiwgc2VsZWN0ZWQpIHtcclxuICAgIGNvbHVtbi52aXNpYmxlID0gc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIub25Db2x1bW5TdGF0ZUNoYW5nZWQoKTtcclxufTtcclxuXHJcbkNvbHVtblNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5nZXRHdWkgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmVSb290UGFuZWwuZ2V0R3VpKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbHVtblNlbGVjdGlvblBhbmVsO1xyXG4iLCJ2YXIgQ2hlY2tib3hTZWxlY3Rpb24gPSByZXF1aXJlKFwiLi4vd2lkZ2V0cy9jaGVja2JveFNlbGVjdGlvblwiKTtcclxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uL2NvbnN0YW50cycpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG52YXIgQm9yZGVyTGF5b3V0ID0gcmVxdWlyZSgnLi4vbGF5b3V0L2JvcmRlckxheW91dCcpO1xyXG52YXIgU3ZnRmFjdG9yeSA9IHJlcXVpcmUoJy4uL3N2Z0ZhY3RvcnknKTtcclxuXHJcbnZhciBzdmdGYWN0b3J5ID0gbmV3IFN2Z0ZhY3RvcnkoKTtcclxuXHJcbmZ1bmN0aW9uIEdyb3VwU2VsZWN0aW9uUGFuZWwoY29sdW1uQ29udHJvbGxlciwgaW5NZW1vcnlSb3dDb250cm9sbGVyLCBncmlkT3B0aW9uc1dyYXBwZXIpIHtcclxuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xyXG4gICAgdGhpcy5zZXR1cENvbXBvbmVudHMoKTtcclxuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlciA9IGNvbHVtbkNvbnRyb2xsZXI7XHJcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlciA9IGluTWVtb3J5Um93Q29udHJvbGxlcjtcclxuXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIuYWRkTGlzdGVuZXIoe1xyXG4gICAgICAgIGNvbHVtbnNDaGFuZ2VkOiB0aGF0LmNvbHVtbnNDaGFuZ2VkLmJpbmQodGhhdClcclxuICAgIH0pO1xyXG59XHJcblxyXG5Hcm91cFNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5jb2x1bW5zQ2hhbmdlZCA9IGZ1bmN0aW9uKG5ld0NvbHVtbnMsIG5ld0dyb3VwZWRDb2x1bW5zKSB7XHJcbiAgICB0aGlzLmNDb2x1bW5MaXN0LnNldE1vZGVsKG5ld0dyb3VwZWRDb2x1bW5zKTtcclxufTtcclxuXHJcbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmdldENvbHVtbkxpc3QgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmNDb2x1bW5MaXN0O1xyXG59O1xyXG5cclxuR3JvdXBTZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuY29sdW1uQ2VsbFJlbmRlcmVyID0gZnVuY3Rpb24ocGFyYW1zKSB7XHJcbiAgICB2YXIgY29sdW1uID0gcGFyYW1zLnZhbHVlO1xyXG4gICAgdmFyIGNvbERpc3BsYXlOYW1lID0gdGhpcy5jb2x1bW5Db250cm9sbGVyLmdldERpc3BsYXlOYW1lRm9yQ29sKGNvbHVtbik7XHJcblxyXG4gICAgdmFyIGVSZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcblxyXG4gICAgdmFyIGVSZW1vdmUgPSB1dGlscy5jcmVhdGVJY29uKCdjb2x1bW5SZW1vdmVGcm9tR3JvdXBJY29uJywgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbiwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd1VwU3ZnKTtcclxuICAgIHV0aWxzLmFkZENzc0NsYXNzKGVSZW1vdmUsICdhZy12aXNpYmxlLWljb25zJyk7XHJcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVSZW1vdmUpO1xyXG5cclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIGVSZW1vdmUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG1vZGVsID0gdGhhdC5jQ29sdW1uTGlzdC5nZXRNb2RlbCgpO1xyXG4gICAgICAgIG1vZGVsLnNwbGljZShtb2RlbC5pbmRleE9mKGNvbHVtbiksIDEpO1xyXG4gICAgICAgIHRoYXQuY0NvbHVtbkxpc3Quc2V0TW9kZWwobW9kZWwpO1xyXG4gICAgICAgIHRoYXQub25Hcm91cGluZ0NoYW5nZWQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHZhciBlVmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICBlVmFsdWUuaW5uZXJIVE1MID0gY29sRGlzcGxheU5hbWU7XHJcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVWYWx1ZSk7XHJcblxyXG4gICAgcmV0dXJuIGVSZXN1bHQ7XHJcbn07XHJcblxyXG5Hcm91cFNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5zZXR1cENvbXBvbmVudHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBsb2NhbGVUZXh0RnVuYyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldExvY2FsZVRleHRGdW5jKCk7XHJcbiAgICB2YXIgY29sdW1uc0xvY2FsVGV4dCA9IGxvY2FsZVRleHRGdW5jKCdwaXZvdGVkQ29sdW1ucycsICdQaXZvdGVkIENvbHVtbnMnKTtcclxuICAgIHZhciBwaXZvdGVkQ29sdW1uc0VtcHR5TWVzc2FnZSA9IGxvY2FsZVRleHRGdW5jKCdwaXZvdGVkQ29sdW1uc0VtcHR5TWVzc2FnZScsICdEcmFnIGNvbHVtbnMgZG93biBmcm9tIGFib3ZlIHRvIHBpdm90IGJ5IHRob3NlIGNvbHVtbnMnKTtcclxuXHJcbiAgICB0aGlzLmNDb2x1bW5MaXN0ID0gbmV3IENoZWNrYm94U2VsZWN0aW9uKCk7XHJcbiAgICB0aGlzLmNDb2x1bW5MaXN0LnNldENlbGxSZW5kZXJlcih0aGlzLmNvbHVtbkNlbGxSZW5kZXJlci5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuY0NvbHVtbkxpc3QuYWRkTW9kZWxDaGFuZ2VkTGlzdGVuZXIodGhpcy5vbkdyb3VwaW5nQ2hhbmdlZC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuY0NvbHVtbkxpc3Quc2V0RW1wdHlNZXNzYWdlKHBpdm90ZWRDb2x1bW5zRW1wdHlNZXNzYWdlKTtcclxuXHJcbiAgICB2YXIgZU5vcnRoUGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGVOb3J0aFBhbmVsLnN0eWxlLnBhZGRpbmdUb3AgPSAnMTBweCc7XHJcbiAgICBlTm9ydGhQYW5lbC5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInRleHQtYWxpZ246IGNlbnRlcjtcIj4nK2NvbHVtbnNMb2NhbFRleHQrJzwvZGl2Pic7XHJcblxyXG4gICAgdGhpcy5sYXlvdXQgPSBuZXcgQm9yZGVyTGF5b3V0KHtcclxuICAgICAgICBjZW50ZXI6IHRoaXMuY0NvbHVtbkxpc3QuZ2V0R3VpKCksXHJcbiAgICAgICAgbm9ydGg6IGVOb3J0aFBhbmVsXHJcbiAgICB9KTtcclxufTtcclxuXHJcbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLm9uR3JvdXBpbmdDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci5kb0dyb3VwaW5nKCk7XHJcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci51cGRhdGVNb2RlbChjb25zdGFudHMuU1RFUF9FVkVSWVRISU5HKTtcclxuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlci5vbkNvbHVtblN0YXRlQ2hhbmdlZCgpO1xyXG59O1xyXG5cclxuR3JvdXBTZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lUm9vdFBhbmVsLmdldEd1aSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHcm91cFNlbGVjdGlvblBhbmVsOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XHJcbnZhciBDb2x1bW5TZWxlY3Rpb25QYW5lbCA9IHJlcXVpcmUoJy4vY29sdW1uU2VsZWN0aW9uUGFuZWwnKTtcclxudmFyIEdyb3VwU2VsZWN0aW9uUGFuZWwgPSByZXF1aXJlKCcuL2dyb3VwU2VsZWN0aW9uUGFuZWwnKTtcclxudmFyIFZlcnRpY2FsU3RhY2sgPSByZXF1aXJlKCcuLi9sYXlvdXQvdmVydGljYWxTdGFjaycpO1xyXG5cclxuZnVuY3Rpb24gVG9vbFBhbmVsKCkge1xyXG4gICAgdGhpcy5sYXlvdXQgPSBuZXcgVmVydGljYWxTdGFjaygpO1xyXG59XHJcblxyXG5Ub29sUGFuZWwucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihjb2x1bW5Db250cm9sbGVyLCBpbk1lbW9yeVJvd0NvbnRyb2xsZXIsIGdyaWRPcHRpb25zV3JhcHBlcikge1xyXG5cclxuICAgIHZhciBjb2x1bW5TZWxlY3Rpb25QYW5lbCA9IG5ldyBDb2x1bW5TZWxlY3Rpb25QYW5lbChjb2x1bW5Db250cm9sbGVyLCBncmlkT3B0aW9uc1dyYXBwZXIpO1xyXG4gICAgdGhpcy5sYXlvdXQuYWRkUGFuZWwoY29sdW1uU2VsZWN0aW9uUGFuZWwubGF5b3V0LCAnNTAlJyk7XHJcbiAgICB2YXIgZ3JvdXBTZWxlY3Rpb25QYW5lbCA9IG5ldyBHcm91cFNlbGVjdGlvblBhbmVsKGNvbHVtbkNvbnRyb2xsZXIsIGluTWVtb3J5Um93Q29udHJvbGxlciwgZ3JpZE9wdGlvbnNXcmFwcGVyKTtcclxuICAgIHRoaXMubGF5b3V0LmFkZFBhbmVsKGdyb3VwU2VsZWN0aW9uUGFuZWwubGF5b3V0LCAnNTAlJyk7XHJcblxyXG4gICAgZ3JvdXBTZWxlY3Rpb25QYW5lbC5nZXRDb2x1bW5MaXN0KCkuYWRkRHJhZ1NvdXJjZShjb2x1bW5TZWxlY3Rpb25QYW5lbC5nZXRDb2x1bW5MaXN0KCkuZ2V0VW5pcXVlSWQoKSk7XHJcblxyXG4gICAgdmFyIGVHdWkgPSB0aGlzLmxheW91dC5nZXRHdWkoKTtcclxuXHJcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhlR3VpLCAnYWctdG9vbC1wYW5lbC1jb250YWluZXInKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVG9vbFBhbmVsO1xyXG4iLCJmdW5jdGlvbiBVdGlscygpIHt9XHJcblxyXG52YXIgRlVOQ1RJT05fU1RSSVBfQ09NTUVOVFMgPSAvKChcXC9cXC8uKiQpfChcXC9cXCpbXFxzXFxTXSo/XFwqXFwvKSkvbWc7XHJcbnZhciBGVU5DVElPTl9BUkdVTUVOVF9OQU1FUyA9IC8oW15cXHMsXSspL2c7XHJcblxyXG5VdGlscy5wcm90b3R5cGUuaXRlcmF0ZU9iamVjdCA9IGZ1bmN0aW9uKG9iamVjdCwgY2FsbGJhY2spIHtcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0KTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcclxuICAgICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcclxuICAgICAgICBjYWxsYmFjayhrZXksIHZhbHVlKTtcclxuICAgIH1cclxufTtcclxuXHJcblV0aWxzLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihhcnJheSwgY2FsbGJhY2spIHtcclxuICAgIHZhciByZXN1bHQgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpPGFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGl0ZW0gPSBhcnJheVtpXTtcclxuICAgICAgICB2YXIgbWFwcGVkSXRlbSA9IGNhbGxiYWNrKGl0ZW0pO1xyXG4gICAgICAgIHJlc3VsdC5wdXNoKG1hcHBlZEl0ZW0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcblV0aWxzLnByb3RvdHlwZS5nZXRGdW5jdGlvblBhcmFtZXRlcnMgPSBmdW5jdGlvbihmdW5jKSB7XHJcbiAgICB2YXIgZm5TdHIgPSBmdW5jLnRvU3RyaW5nKCkucmVwbGFjZShGVU5DVElPTl9TVFJJUF9DT01NRU5UUywgJycpO1xyXG4gICAgdmFyIHJlc3VsdCA9IGZuU3RyLnNsaWNlKGZuU3RyLmluZGV4T2YoJygnKSsxLCBmblN0ci5pbmRleE9mKCcpJykpLm1hdGNoKEZVTkNUSU9OX0FSR1VNRU5UX05BTUVTKTtcclxuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUudG9TdHJpbmdzID0gZnVuY3Rpb24oYXJyYXkpIHtcclxuICAgIHJldHVybiB0aGlzLm1hcChhcnJheSwgZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8IGl0ZW0gPT09IG51bGwgfHwgIWl0ZW0udG9TdHJpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9TdHJpbmcoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qXHJcblV0aWxzLnByb3RvdHlwZS5vYmplY3RWYWx1ZXNUb0FycmF5ID0gZnVuY3Rpb24ob2JqZWN0KSB7XHJcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7XHJcbiAgICB2YXIgcmVzdWx0ID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaTxrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XHJcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuKi9cclxuXHJcblV0aWxzLnByb3RvdHlwZS5pdGVyYXRlQXJyYXkgPSBmdW5jdGlvbihhcnJheSwgY2FsbGJhY2spIHtcclxuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXg8YXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaW5kZXhdO1xyXG4gICAgICAgIGNhbGxiYWNrKHZhbHVlLCBpbmRleCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihleHByZXNzaW9uU2VydmljZSwgZGF0YSwgY29sRGVmLCBub2RlLCBhcGksIGNvbnRleHQpIHtcclxuXHJcbiAgICB2YXIgdmFsdWVHZXR0ZXIgPSBjb2xEZWYudmFsdWVHZXR0ZXI7XHJcbiAgICB2YXIgZmllbGQgPSBjb2xEZWYuZmllbGQ7XHJcblxyXG4gICAgLy8gaWYgdGhlcmUgaXMgYSB2YWx1ZSBnZXR0ZXIsIHRoaXMgZ2V0cyBwcmVjZWRlbmNlIG92ZXIgYSBmaWVsZFxyXG4gICAgaWYgKHZhbHVlR2V0dGVyKSB7XHJcblxyXG4gICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXHJcbiAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxyXG4gICAgICAgICAgICBhcGk6IGFwaSxcclxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWVHZXR0ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgLy8gdmFsdWVHZXR0ZXIgaXMgYSBmdW5jdGlvbiwgc28ganVzdCBjYWxsIGl0XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUdldHRlcihwYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlR2V0dGVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAvLyB2YWx1ZUdldHRlciBpcyBhbiBleHByZXNzaW9uLCBzbyBleGVjdXRlIHRoZSBleHByZXNzaW9uXHJcbiAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uU2VydmljZS5ldmFsdWF0ZSh2YWx1ZUdldHRlciwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmIChmaWVsZCAmJiBkYXRhKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFbZmllbGRdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy9SZXR1cm5zIHRydWUgaWYgaXQgaXMgYSBET00gbm9kZVxyXG4vL3Rha2VuIGZyb206IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxyXG5VdGlscy5wcm90b3R5cGUuaXNOb2RlID0gZnVuY3Rpb24obykge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICB0eXBlb2YgTm9kZSA9PT0gXCJvYmplY3RcIiA/IG8gaW5zdGFuY2VvZiBOb2RlIDpcclxuICAgICAgICBvICYmIHR5cGVvZiBvID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvLm5vZGVUeXBlID09PSBcIm51bWJlclwiICYmIHR5cGVvZiBvLm5vZGVOYW1lID09PSBcInN0cmluZ1wiXHJcbiAgICApO1xyXG59O1xyXG5cclxuLy9SZXR1cm5zIHRydWUgaWYgaXQgaXMgYSBET00gZWxlbWVudFxyXG4vL3Rha2VuIGZyb206IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxyXG5VdGlscy5wcm90b3R5cGUuaXNFbGVtZW50ID0gZnVuY3Rpb24obykge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICB0eXBlb2YgSFRNTEVsZW1lbnQgPT09IFwib2JqZWN0XCIgPyBvIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgOiAvL0RPTTJcclxuICAgICAgICBvICYmIHR5cGVvZiBvID09PSBcIm9iamVjdFwiICYmIG8gIT09IG51bGwgJiYgby5ub2RlVHlwZSA9PT0gMSAmJiB0eXBlb2Ygby5ub2RlTmFtZSA9PT0gXCJzdHJpbmdcIlxyXG4gICAgKTtcclxufTtcclxuXHJcblV0aWxzLnByb3RvdHlwZS5pc05vZGVPckVsZW1lbnQgPSBmdW5jdGlvbihvKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pc05vZGUobykgfHwgdGhpcy5pc0VsZW1lbnQobyk7XHJcbn07XHJcblxyXG4vL2FkZHMgYWxsIHR5cGUgb2YgY2hhbmdlIGxpc3RlbmVycyB0byBhbiBlbGVtZW50LCBpbnRlbmRlZCB0byBiZSBhIHRleHQgZmllbGRcclxuVXRpbHMucHJvdG90eXBlLmFkZENoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgbGlzdGVuZXIpIHtcclxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZWRcIiwgbGlzdGVuZXIpO1xyXG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwicGFzdGVcIiwgbGlzdGVuZXIpO1xyXG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgbGlzdGVuZXIpO1xyXG59O1xyXG5cclxuLy9pZiB2YWx1ZSBpcyB1bmRlZmluZWQsIG51bGwgb3IgYmxhbmssIHJldHVybnMgbnVsbCwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHZhbHVlXHJcblV0aWxzLnByb3RvdHlwZS5tYWtlTnVsbCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gXCJcIikge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUucmVtb3ZlQWxsQ2hpbGRyZW4gPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICBpZiAobm9kZSkge1xyXG4gICAgICAgIHdoaWxlIChub2RlLmhhc0NoaWxkTm9kZXMoKSkge1xyXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUubGFzdENoaWxkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vL2FkZHMgYW4gZWxlbWVudCB0byBhIGRpdiwgYnV0IGFsc28gYWRkcyBhIGJhY2tncm91bmQgY2hlY2tpbmcgZm9yIGNsaWNrcyxcclxuLy9zbyB0aGF0IHdoZW4gdGhlIGJhY2tncm91bmQgaXMgY2xpY2tlZCwgdGhlIGNoaWxkIGlzIHJlbW92ZWQgYWdhaW4sIGdpdmluZ1xyXG4vL2EgbW9kZWwgbG9vayB0byBwb3B1cHMuXHJcblV0aWxzLnByb3RvdHlwZS5hZGRBc01vZGFsUG9wdXAgPSBmdW5jdGlvbihlUGFyZW50LCBlQ2hpbGQpIHtcclxuICAgIHZhciBlQmFja2Ryb3AgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZUJhY2tkcm9wLmNsYXNzTmFtZSA9IFwiYWctcG9wdXAtYmFja2Ryb3BcIjtcclxuXHJcbiAgICBlQmFja2Ryb3Aub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGVQYXJlbnQucmVtb3ZlQ2hpbGQoZUNoaWxkKTtcclxuICAgICAgICBlUGFyZW50LnJlbW92ZUNoaWxkKGVCYWNrZHJvcCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQoZUJhY2tkcm9wKTtcclxuICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQoZUNoaWxkKTtcclxufTtcclxuXHJcbi8vbG9hZHMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIGl0IGFzIGFuIGVsZW1lbnQuIG1ha2VzIHVwIGZvciBubyBzaW1wbGUgd2F5IGluXHJcbi8vdGhlIGRvbSBhcGkgdG8gbG9hZCBodG1sIGRpcmVjdGx5LCBlZyB3ZSBjYW5ub3QgZG8gdGhpczogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0ZW1wbGF0ZSlcclxuVXRpbHMucHJvdG90eXBlLmxvYWRUZW1wbGF0ZSA9IGZ1bmN0aW9uKHRlbXBsYXRlKSB7XHJcbiAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHRlbXBsYXRlO1xyXG4gICAgcmV0dXJuIHRlbXBEaXYuZmlyc3RDaGlsZDtcclxufTtcclxuXHJcbi8vaWYgcGFzc2VkICc0MnB4JyB0aGVuIHJldHVybnMgdGhlIG51bWJlciA0MlxyXG5VdGlscy5wcm90b3R5cGUucGl4ZWxTdHJpbmdUb051bWJlciA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgaWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICBpZiAodmFsLmluZGV4T2YoXCJweFwiKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHZhbC5yZXBsYWNlKFwicHhcIiwgXCJcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwYXJzZUludCh2YWwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVXRpbHMucHJvdG90eXBlLnF1ZXJ5U2VsZWN0b3JBbGxfYWRkQ3NzQ2xhc3MgPSBmdW5jdGlvbihlUGFyZW50LCBzZWxlY3RvciwgY3NzQ2xhc3MpIHtcclxuICAgIHZhciBlUm93cyA9IGVQYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGVSb3dzLmxlbmd0aDsgaysrKSB7XHJcbiAgICAgICAgdGhpcy5hZGRDc3NDbGFzcyhlUm93c1trXSwgY3NzQ2xhc3MpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVXRpbHMucHJvdG90eXBlLnF1ZXJ5U2VsZWN0b3JBbGxfcmVtb3ZlQ3NzQ2xhc3MgPSBmdW5jdGlvbihlUGFyZW50LCBzZWxlY3RvciwgY3NzQ2xhc3MpIHtcclxuICAgIHZhciBlUm93cyA9IGVQYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGVSb3dzLmxlbmd0aDsgaysrKSB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVDc3NDbGFzcyhlUm93c1trXSwgY3NzQ2xhc3MpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVXRpbHMucHJvdG90eXBlLnF1ZXJ5U2VsZWN0b3JBbGxfcmVwbGFjZUNzc0NsYXNzID0gZnVuY3Rpb24oZVBhcmVudCwgc2VsZWN0b3IsIGNzc0NsYXNzVG9SZW1vdmUsIGNzc0NsYXNzVG9BZGQpIHtcclxuICAgIHZhciBlUm93cyA9IGVQYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGVSb3dzLmxlbmd0aDsgaysrKSB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVDc3NDbGFzcyhlUm93c1trXSwgY3NzQ2xhc3NUb1JlbW92ZSk7XHJcbiAgICAgICAgdGhpcy5hZGRDc3NDbGFzcyhlUm93c1trXSwgY3NzQ2xhc3NUb0FkZCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUuYWRkT3JSZW1vdmVDc3NDbGFzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNsYXNzTmFtZSwgYWRkT3JSZW1vdmUpIHtcclxuICAgIGlmIChhZGRPclJlbW92ZSkge1xyXG4gICAgICAgIHRoaXMuYWRkQ3NzQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVDc3NDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuVXRpbHMucHJvdG90eXBlLmFkZENzc0NsYXNzID0gZnVuY3Rpb24oZWxlbWVudCwgY2xhc3NOYW1lKSB7XHJcbiAgICBpZiAoZWxlbWVudC5jbGFzc05hbWUgJiYgZWxlbWVudC5jbGFzc05hbWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHZhciBjc3NDbGFzc2VzID0gZWxlbWVudC5jbGFzc05hbWUuc3BsaXQoJyAnKTtcclxuICAgICAgICBpZiAoY3NzQ2xhc3Nlcy5pbmRleE9mKGNsYXNzTmFtZSkgPCAwKSB7XHJcbiAgICAgICAgICAgIGNzc0NsYXNzZXMucHVzaChjbGFzc05hbWUpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmNsYXNzTmFtZSA9IGNzc0NsYXNzZXMuam9pbignICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUub2Zmc2V0SGVpZ2h0ID0gZnVuY3Rpb24oZWxlbWVudCkge1xyXG4gICAgcmV0dXJuIGVsZW1lbnQgJiYgZWxlbWVudC5jbGllbnRIZWlnaHQgPyBlbGVtZW50LmNsaWVudEhlaWdodCA6IDA7XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUub2Zmc2V0V2lkdGggPSBmdW5jdGlvbihlbGVtZW50KSB7XHJcbiAgICByZXR1cm4gZWxlbWVudCAmJiBlbGVtZW50LmNsaWVudFdpZHRoID8gZWxlbWVudC5jbGllbnRXaWR0aCA6IDA7XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUucmVtb3ZlQ3NzQ2xhc3MgPSBmdW5jdGlvbihlbGVtZW50LCBjbGFzc05hbWUpIHtcclxuICAgIGlmIChlbGVtZW50LmNsYXNzTmFtZSAmJiBlbGVtZW50LmNsYXNzTmFtZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdmFyIGNzc0NsYXNzZXMgPSBlbGVtZW50LmNsYXNzTmFtZS5zcGxpdCgnICcpO1xyXG4gICAgICAgIHZhciBpbmRleCA9IGNzc0NsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpO1xyXG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICAgIGNzc0NsYXNzZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBjc3NDbGFzc2VzLmpvaW4oJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUucmVtb3ZlRnJvbUFycmF5ID0gZnVuY3Rpb24oYXJyYXksIG9iamVjdCkge1xyXG4gICAgYXJyYXkuc3BsaWNlKGFycmF5LmluZGV4T2Yob2JqZWN0KSwgMSk7XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUuZGVmYXVsdENvbXBhcmF0b3IgPSBmdW5jdGlvbih2YWx1ZUEsIHZhbHVlQikge1xyXG4gICAgdmFyIHZhbHVlQU1pc3NpbmcgPSB2YWx1ZUEgPT09IG51bGwgfHwgdmFsdWVBID09PSB1bmRlZmluZWQ7XHJcbiAgICB2YXIgdmFsdWVCTWlzc2luZyA9IHZhbHVlQiA9PT0gbnVsbCB8fCB2YWx1ZUIgPT09IHVuZGVmaW5lZDtcclxuICAgIGlmICh2YWx1ZUFNaXNzaW5nICYmIHZhbHVlQk1pc3NpbmcpIHtcclxuICAgICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuICAgIGlmICh2YWx1ZUFNaXNzaW5nKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gICAgaWYgKHZhbHVlQk1pc3NpbmcpIHtcclxuICAgICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodmFsdWVBIDwgdmFsdWVCKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfSBlbHNlIGlmICh2YWx1ZUEgPiB2YWx1ZUIpIHtcclxuICAgICAgICByZXR1cm4gMTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUuZm9ybWF0V2lkdGggPSBmdW5jdGlvbih3aWR0aCkge1xyXG4gICAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIHJldHVybiB3aWR0aCArIFwicHhcIjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHdpZHRoO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gdHJpZXMgdG8gdXNlIHRoZSBwcm92aWRlZCByZW5kZXJlci4gaWYgYSByZW5kZXJlciBmb3VuZCwgcmV0dXJucyB0cnVlLlxyXG4vLyBpZiBubyByZW5kZXJlciwgcmV0dXJucyBmYWxzZS5cclxuVXRpbHMucHJvdG90eXBlLnVzZVJlbmRlcmVyID0gZnVuY3Rpb24oZVBhcmVudCwgZVJlbmRlcmVyLCBwYXJhbXMpIHtcclxuICAgIHZhciByZXN1bHRGcm9tUmVuZGVyZXIgPSBlUmVuZGVyZXIocGFyYW1zKTtcclxuICAgIGlmICh0aGlzLmlzTm9kZShyZXN1bHRGcm9tUmVuZGVyZXIpIHx8IHRoaXMuaXNFbGVtZW50KHJlc3VsdEZyb21SZW5kZXJlcikpIHtcclxuICAgICAgICAvL2EgZG9tIG5vZGUgb3IgZWxlbWVudCB3YXMgcmV0dXJuZWQsIHNvIGFkZCBjaGlsZFxyXG4gICAgICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQocmVzdWx0RnJvbVJlbmRlcmVyKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy9vdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxyXG4gICAgICAgIHZhciBlVGV4dFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICAgICAgZVRleHRTcGFuLmlubmVySFRNTCA9IHJlc3VsdEZyb21SZW5kZXJlcjtcclxuICAgICAgICBlUGFyZW50LmFwcGVuZENoaWxkKGVUZXh0U3Bhbik7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBpZiBpY29uIHByb3ZpZGVkLCB1c2UgdGhpcyAoZWl0aGVyIGEgc3RyaW5nLCBvciBhIGZ1bmN0aW9uIGNhbGxiYWNrKS5cclxuLy8gaWYgbm90LCB0aGVuIHVzZSB0aGUgc2Vjb25kIHBhcmFtZXRlciwgd2hpY2ggaXMgdGhlIHN2Z0ZhY3RvcnkgZnVuY3Rpb25cclxuVXRpbHMucHJvdG90eXBlLmNyZWF0ZUljb24gPSBmdW5jdGlvbihpY29uTmFtZSwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2xEZWZXcmFwcGVyLCBzdmdGYWN0b3J5RnVuYykge1xyXG4gICAgdmFyIGVSZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICB2YXIgdXNlclByb3ZpZGVkSWNvbjtcclxuICAgIC8vIGNoZWNrIGNvbCBmb3IgaWNvbiBmaXJzdFxyXG4gICAgaWYgKGNvbERlZldyYXBwZXIgJiYgY29sRGVmV3JhcHBlci5jb2xEZWYuaWNvbnMpIHtcclxuICAgICAgICB1c2VyUHJvdmlkZWRJY29uID0gY29sRGVmV3JhcHBlci5jb2xEZWYuaWNvbnNbaWNvbk5hbWVdO1xyXG4gICAgfVxyXG4gICAgLy8gaXQgbm90IGluIGNvbCwgdHJ5IGdyaWQgb3B0aW9uc1xyXG4gICAgaWYgKCF1c2VyUHJvdmlkZWRJY29uICYmIGdyaWRPcHRpb25zV3JhcHBlci5nZXRJY29ucygpKSB7XHJcbiAgICAgICAgdXNlclByb3ZpZGVkSWNvbiA9IGdyaWRPcHRpb25zV3JhcHBlci5nZXRJY29ucygpW2ljb25OYW1lXTtcclxuICAgIH1cclxuICAgIC8vIG5vdyBpZiB1c2VyIHByb3ZpZGVkLCB1c2UgaXRcclxuICAgIGlmICh1c2VyUHJvdmlkZWRJY29uKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyUmVzdWx0O1xyXG4gICAgICAgIGlmICh0eXBlb2YgdXNlclByb3ZpZGVkSWNvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICByZW5kZXJlclJlc3VsdCA9IHVzZXJQcm92aWRlZEljb24oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB1c2VyUHJvdmlkZWRJY29uID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICByZW5kZXJlclJlc3VsdCA9IHVzZXJQcm92aWRlZEljb247XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgJ2ljb24gZnJvbSBncmlkIG9wdGlvbnMgbmVlZHMgdG8gYmUgYSBzdHJpbmcgb3IgYSBmdW5jdGlvbic7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgcmVuZGVyZXJSZXN1bHQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIGVSZXN1bHQuaW5uZXJIVE1MID0gcmVuZGVyZXJSZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzTm9kZU9yRWxlbWVudChyZW5kZXJlclJlc3VsdCkpIHtcclxuICAgICAgICAgICAgZVJlc3VsdC5hcHBlbmRDaGlsZChyZW5kZXJlclJlc3VsdCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgJ2ljb25SZW5kZXJlciBzaG91bGQgcmV0dXJuIGJhY2sgYSBzdHJpbmcgb3IgYSBkb20gb2JqZWN0JztcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIG90aGVyd2lzZSB3ZSB1c2UgdGhlIGJ1aWx0IGluIGljb25cclxuICAgICAgICBlUmVzdWx0LmFwcGVuZENoaWxkKHN2Z0ZhY3RvcnlGdW5jKCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVSZXN1bHQ7XHJcbn07XHJcblxyXG5cclxuVXRpbHMucHJvdG90eXBlLmdldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG91dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIG91dGVyLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgb3V0ZXIuc3R5bGUud2lkdGggPSBcIjEwMHB4XCI7XHJcbiAgICBvdXRlci5zdHlsZS5tc092ZXJmbG93U3R5bGUgPSBcInNjcm9sbGJhclwiOyAvLyBuZWVkZWQgZm9yIFdpbkpTIGFwcHNcclxuXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG91dGVyKTtcclxuXHJcbiAgICB2YXIgd2lkdGhOb1Njcm9sbCA9IG91dGVyLm9mZnNldFdpZHRoO1xyXG4gICAgLy8gZm9yY2Ugc2Nyb2xsYmFyc1xyXG4gICAgb3V0ZXIuc3R5bGUub3ZlcmZsb3cgPSBcInNjcm9sbFwiO1xyXG5cclxuICAgIC8vIGFkZCBpbm5lcmRpdlxyXG4gICAgdmFyIGlubmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGlubmVyLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XHJcbiAgICBvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7XHJcblxyXG4gICAgdmFyIHdpZHRoV2l0aFNjcm9sbCA9IGlubmVyLm9mZnNldFdpZHRoO1xyXG5cclxuICAgIC8vIHJlbW92ZSBkaXZzXHJcbiAgICBvdXRlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG91dGVyKTtcclxuXHJcbiAgICByZXR1cm4gd2lkdGhOb1Njcm9sbCAtIHdpZHRoV2l0aFNjcm9sbDtcclxufTtcclxuXHJcblV0aWxzLnByb3RvdHlwZS5pc0tleVByZXNzZWQgPSBmdW5jdGlvbihldmVudCwga2V5VG9DaGVjaykge1xyXG4gICAgdmFyIHByZXNzZWRLZXkgPSBldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlO1xyXG4gICAgcmV0dXJuIHByZXNzZWRLZXkgPT09IGtleVRvQ2hlY2s7XHJcbn07XHJcblxyXG5VdGlscy5wcm90b3R5cGUuc2V0VmlzaWJsZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZpc2libGUpIHtcclxuICAgIGlmICh2aXNpYmxlKSB7XHJcbiAgICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZSc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IFV0aWxzKCk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPWFnLWxpc3Qtc2VsZWN0aW9uPjxkaXY+PGRpdiBhZy1yZXBlYXQ+PC9kaXY+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL2NoZWNrYm94U2VsZWN0aW9uLmh0bWwnKTtcclxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcclxudmFyIGRyYWdBbmREcm9wU2VydmljZSA9IHJlcXVpcmUoJy4uL2RyYWdBbmREcm9wL2RyYWdBbmREcm9wU2VydmljZScpO1xyXG5cclxudmFyIE5PVF9EUk9QX1RBUkdFVCA9IDA7XHJcbnZhciBEUk9QX1RBUkdFVF9BQk9WRSA9IDE7XHJcbnZhciBEUk9QX1RBUkdFVF9CRUxPVyA9IC0xMTtcclxuXHJcbmZ1bmN0aW9uIENoZWNrYm94U2VsZWN0aW9uKCkge1xyXG4gICAgdGhpcy5zZXR1cENvbXBvbmVudHMoKTtcclxuICAgIHRoaXMudW5pcXVlSWQgPSAnQ2hlY2tib3hTZWxlY3Rpb24tJyArIE1hdGgucmFuZG9tKCk7XHJcbiAgICB0aGlzLm1vZGVsQ2hhbmdlZExpc3RlbmVycyA9IFtdO1xyXG4gICAgdGhpcy5kcmFnU291cmNlcyA9IFtdO1xyXG4gICAgdGhpcy5zZXR1cEFzRHJvcFRhcmdldCgpO1xyXG59XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuc2V0RW1wdHlNZXNzYWdlID0gZnVuY3Rpb24oZW1wdHlNZXNzYWdlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lbXB0eU1lc3NhZ2UgPSBlbXB0eU1lc3NhZ2U7XHJcbiAgICB0aGlzLnJlZnJlc2hWaWV3KCk7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZ2V0VW5pcXVlSWQgPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLnVuaXF1ZUlkO1xyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmFkZERyYWdTb3VyY2UgPSBmdW5jdGlvbihkcmFnU291cmNlKSB7XHJcbiAgICB0aGlzLmRyYWdTb3VyY2VzLnB1c2goZHJhZ1NvdXJjZSk7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuYWRkTW9kZWxDaGFuZ2VkTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xyXG4gICAgdGhpcy5tb2RlbENoYW5nZWRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZmlyZU1vZGVsQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGk8dGhpcy5tb2RlbENoYW5nZWRMaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0aGlzLm1vZGVsQ2hhbmdlZExpc3RlbmVyc1tpXSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnNldHVwQ29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0ZW1wbGF0ZSk7XHJcbiAgICB0aGlzLmVGaWx0ZXJWYWx1ZVRlbXBsYXRlID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCJbYWctcmVwZWF0XVwiKTtcclxuXHJcbiAgICB0aGlzLmVMaXN0UGFyZW50ID0gdGhpcy5lRmlsdGVyVmFsdWVUZW1wbGF0ZS5wYXJlbnROb2RlO1xyXG4gICAgdXRpbHMucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lTGlzdFBhcmVudCk7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuc2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbCkge1xyXG4gICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xyXG4gICAgdGhpcy5yZWZyZXNoVmlldygpO1xyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5tb2RlbDtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5zZXRDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbihjZWxsUmVuZGVyZXIpIHtcclxuICAgIHRoaXMuY2VsbFJlbmRlcmVyID0gY2VsbFJlbmRlcmVyO1xyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnJlZnJlc2hWaWV3ID0gZnVuY3Rpb24oKSB7XHJcbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVMaXN0UGFyZW50KTtcclxuXHJcbiAgICBpZiAodGhpcy5tb2RlbCAmJiB0aGlzLm1vZGVsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICB0aGlzLmluc2VydFJvd3MoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pbnNlcnRCbGFua01lc3NhZ2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnRSb3dzID0gZnVuY3Rpb24oKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLm1vZGVsLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGl0ZW0gPSB0aGlzLm1vZGVsW2ldO1xyXG4gICAgICAgIC8vdmFyIHRleHQgPSB0aGlzLmdldFRleHQoaXRlbSk7XHJcbiAgICAgICAgLy92YXIgc2VsZWN0ZWQgPSB0aGlzLmlzU2VsZWN0ZWQoaXRlbSk7XHJcbiAgICAgICAgdmFyIGVMaXN0SXRlbSA9IHRoaXMuZUZpbHRlclZhbHVlVGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jZWxsUmVuZGVyZXIpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt2YWx1ZTogaXRlbX07XHJcbiAgICAgICAgICAgIHV0aWxzLnVzZVJlbmRlcmVyKGVMaXN0SXRlbSwgdGhpcy5jZWxsUmVuZGVyZXIsIHBhcmFtcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZUxpc3RJdGVtLmlubmVySFRNTCA9IGl0ZW07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZERyYWdBbmREcm9wVG9MaXN0SXRlbShlTGlzdEl0ZW0sIGl0ZW0pO1xyXG4gICAgICAgIHRoaXMuZUxpc3RQYXJlbnQuYXBwZW5kQ2hpbGQoZUxpc3RJdGVtKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnRCbGFua01lc3NhZ2UgPSBmdW5jdGlvbigpIHtcclxuICAgIGlmICh0aGlzLmVtcHR5TWVzc2FnZSkge1xyXG4gICAgICAgIHZhciBlTWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGVNZXNzYWdlLnN0eWxlLmNvbG9yID0gJ2dyZXknO1xyXG4gICAgICAgIGVNZXNzYWdlLnN0eWxlLnBhZGRpbmcgPSAnMjBweCc7XHJcbiAgICAgICAgZU1lc3NhZ2Uuc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICAgICAgZU1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5lbXB0eU1lc3NhZ2U7XHJcbiAgICAgICAgdGhpcy5lTGlzdFBhcmVudC5hcHBlbmRDaGlsZChlTWVzc2FnZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZ2V0RHJhZ0l0ZW0gPSBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLmRyYWdJdGVtO1xyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnNldHVwQXNEcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgZHJhZ0FuZERyb3BTZXJ2aWNlLmFkZERyb3BUYXJnZXQodGhpcy5lR3VpLCB7XHJcbiAgICAgICAgYWNjZXB0RHJhZzogdGhpcy5leHRlcm5hbEFjY2VwdERyYWcuYmluZCh0aGlzKSxcclxuICAgICAgICBkcm9wOiB0aGlzLmV4dGVybmFsRHJvcC5iaW5kKHRoaXMpLFxyXG4gICAgICAgIG5vRHJvcDogdGhpcy5leHRlcm5hbE5vRHJvcC5iaW5kKHRoaXMpXHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5leHRlcm5hbEFjY2VwdERyYWcgPSBmdW5jdGlvbihkcmFnRXZlbnQpIHtcclxuICAgIHZhciBhbGxvd2VkU291cmNlID0gdGhpcy5kcmFnU291cmNlcy5pbmRleE9mKGRyYWdFdmVudC5jb250YWluZXJJZCkgPj0gMDtcclxuICAgIGlmICghYWxsb3dlZFNvdXJjZSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHZhciBhbHJlYWR5SGF2ZUNvbCA9IHRoaXMubW9kZWwuaW5kZXhPZihkcmFnRXZlbnQuZGF0YSkgPj0gMDtcclxuICAgIGlmIChhbHJlYWR5SGF2ZUNvbCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHRoaXMuZUd1aS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnbGlnaHRncmVlbic7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5leHRlcm5hbERyb3AgPSBmdW5jdGlvbihkcmFnRXZlbnQpIHtcclxuICAgIHRoaXMuYWRkSXRlbVRvTGlzdChkcmFnRXZlbnQuZGF0YSk7XHJcbiAgICB0aGlzLmVHdWkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZXh0ZXJuYWxOb0Ryb3AgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZUd1aS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5hZGRJdGVtVG9MaXN0ID0gZnVuY3Rpb24obmV3SXRlbSkge1xyXG4gICAgdGhpcy5tb2RlbC5wdXNoKG5ld0l0ZW0pO1xyXG4gICAgdGhpcy5yZWZyZXNoVmlldygpO1xyXG4gICAgdGhpcy5maXJlTW9kZWxDaGFuZ2VkKCk7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuYWRkRHJhZ0FuZERyb3BUb0xpc3RJdGVtID0gZnVuY3Rpb24oZUxpc3RJdGVtLCBpdGVtKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICBkcmFnQW5kRHJvcFNlcnZpY2UuYWRkRHJhZ1NvdXJjZShlTGlzdEl0ZW0sIHtcclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHsgcmV0dXJuIGl0ZW07IH0sXHJcbiAgICAgICAgZ2V0Q29udGFpbmVySWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhhdC51bmlxdWVJZDsgfVxyXG4gICAgfSk7XHJcbiAgICBkcmFnQW5kRHJvcFNlcnZpY2UuYWRkRHJvcFRhcmdldChlTGlzdEl0ZW0sIHtcclxuICAgICAgICBhY2NlcHREcmFnOiBmdW5jdGlvbiAoZHJhZ0l0ZW0pIHsgcmV0dXJuIHRoYXQuaW50ZXJuYWxBY2NlcHREcmFnKGl0ZW0sIGRyYWdJdGVtLCBlTGlzdEl0ZW0pOyB9LFxyXG4gICAgICAgIGRyb3A6IGZ1bmN0aW9uIChkcmFnSXRlbSkgeyB0aGF0LmludGVybmFsRHJvcChpdGVtLCBkcmFnSXRlbS5kYXRhKTsgfSxcclxuICAgICAgICBub0Ryb3A6IGZ1bmN0aW9uICgpIHsgdGhhdC5pbnRlcm5hbE5vRHJvcChlTGlzdEl0ZW0pOyB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnRlcm5hbEFjY2VwdERyYWcgPSBmdW5jdGlvbih0YXJnZXRDb2x1bW4sIGRyYWdJdGVtLCBlTGlzdEl0ZW0pIHtcclxuICAgIHZhciByZXN1bHQgPSBkcmFnSXRlbS5kYXRhICE9PSB0YXJnZXRDb2x1bW4gJiYgZHJhZ0l0ZW0uY29udGFpbmVySWQgPT09IHRoaXMudW5pcXVlSWQ7XHJcbiAgICBpZiAocmVzdWx0KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZHJhZ0FmdGVyVGhpc0l0ZW0odGFyZ2V0Q29sdW1uLCBkcmFnSXRlbS5kYXRhKSkge1xyXG4gICAgICAgICAgICB0aGlzLnNldERyb3BDc3NDbGFzc2VzKGVMaXN0SXRlbSwgRFJPUF9UQVJHRVRfQUJPVkUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RHJvcENzc0NsYXNzZXMoZUxpc3RJdGVtLCBEUk9QX1RBUkdFVF9CRUxPVyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnRlcm5hbERyb3AgPSBmdW5jdGlvbih0YXJnZXRDb2x1bW4sIGRyYWdnZWRDb2x1bW4pIHtcclxuICAgIHZhciBvbGRJbmRleCA9IHRoaXMubW9kZWwuaW5kZXhPZihkcmFnZ2VkQ29sdW1uKTtcclxuICAgIHZhciBuZXdJbmRleCA9IHRoaXMubW9kZWwuaW5kZXhPZih0YXJnZXRDb2x1bW4pO1xyXG5cclxuICAgIHRoaXMubW9kZWwuc3BsaWNlKG9sZEluZGV4LCAxKTtcclxuICAgIHRoaXMubW9kZWwuc3BsaWNlKG5ld0luZGV4LCAwLCBkcmFnZ2VkQ29sdW1uKTtcclxuXHJcbiAgICB0aGlzLnJlZnJlc2hWaWV3KCk7XHJcbiAgICB0aGlzLmZpcmVNb2RlbENoYW5nZWQoKTtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnRlcm5hbE5vRHJvcCA9IGZ1bmN0aW9uKGVMaXN0SXRlbSkge1xyXG4gICAgdGhpcy5zZXREcm9wQ3NzQ2xhc3NlcyhlTGlzdEl0ZW0sIE5PVF9EUk9QX1RBUkdFVCk7XHJcbn07XHJcblxyXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZHJhZ0FmdGVyVGhpc0l0ZW0gPSBmdW5jdGlvbih0YXJnZXRDb2x1bW4sIGRyYWdnZWRDb2x1bW4pIHtcclxuICAgIHJldHVybiB0aGlzLm1vZGVsLmluZGV4T2YodGFyZ2V0Q29sdW1uKSA8IHRoaXMubW9kZWwuaW5kZXhPZihkcmFnZ2VkQ29sdW1uKTtcclxufTtcclxuXHJcbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5zZXREcm9wQ3NzQ2xhc3NlcyA9IGZ1bmN0aW9uKGVMaXN0SXRlbSwgc3RhdGUpIHtcclxuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctbm90LWRyb3AtdGFyZ2V0Jywgc3RhdGUgPT09IE5PVF9EUk9QX1RBUkdFVCk7XHJcbiAgICB1dGlscy5hZGRPclJlbW92ZUNzc0NsYXNzKGVMaXN0SXRlbSwgJ2FnLWRyb3AtdGFyZ2V0LWFib3ZlJywgc3RhdGUgPT09IERST1BfVEFSR0VUX0FCT1ZFKTtcclxuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctZHJvcC10YXJnZXQtYmVsb3cnLCBzdGF0ZSA9PT0gRFJPUF9UQVJHRVRfQkVMT1cpO1xyXG59O1xyXG5cclxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmdldEd1aSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZUd1aTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3hTZWxlY3Rpb247XHJcbiJdfQ==
