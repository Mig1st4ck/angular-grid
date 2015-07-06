var rowExpandedModule = angular.module('rowExpanded', ['angularGrid']);

rowExpandedModule.controller('rowExpandedController', function($scope, $interval) {

    var rowData = [
        {
          name: 'Afonso',
          size: '123 Mb',
          type: 'Dir'
        },
        {
          name: 'Miguel',
          size: '10 Kb',
          type: 'Dir'
        }
    ];

    var columnDefs = [
        {headerName: "Name", field: "name", width: 250, cellRenderer: {
            renderer: 'group',
            innerRenderer: function(params){
              return ' ' + params.data.name;
            }
        }},
        {headerName: "Size", field: "size", width: 70, cellStyle: sizeCellStyle},
        {headerName: "Type", field: "type", width: 150},
        {headerName: "Date Modified", field: "dateModified", width: 150}
    ];

    $scope.gridOptions = {
        expandRow: innerCellRenderer,
        expandedRowsDefault: 3,
        rowsAlreadyGrouped: true,
        columnDefs: columnDefs,
        rowData: rowData,
        rowSelection: 'multiple',
        enableColResize: true,
        enableSorting: true,
        rowHeight: 20,
        icons: {
            groupExpanded: '<i class="fa fa-minus-square-o"/>',
            groupContracted: '<i class="fa fa-plus-square-o"/>'
        },
        rowClicked: rowClicked,
        groupInnerRenderer: groupInnerRendererFunc
    };

    $scope.selectedFile = 'Select a file below...';

    function rowClicked(params) {
        var node = params.node;
        var path = node.data.name;
        while (node.parent) {
            node = node.parent;
            path = node.data.name + '\\' + path;
        }
        $scope.selectedFile = path;
    }

    function sizeCellStyle() {
        return {'text-align': 'right'};
    }

    function innerCellRenderer(params) {
        var eGroupCell = document.createElement('div');
        eGroupCell.style.backgroundColor = 'red';
        eGroupCell.style.height = '100%';
        var node = params.node;


        var eText = document.createTextNode('TEXTO');
        eGroupCell.appendChild(eText);

        return eGroupCell;
    }

    function groupInnerRendererFunc(params) {
        return params.node.data.name;
    }

});
