var rowExpandedModule = angular.module('rowExpanded', ['angularGrid']);

rowExpandedModule.controller('rowExpandedController', function($scope, $interval) {

    var rowData = [
        {
          name: 'Afonso',
          size: '123 Mb',
          type: 'Dir',
          rows: 5
        },
        {
          name: 'Miguel',
          size: '10 Kb',
          type: 'Dir',
          rows: 8
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
        expandedRowsDefault: function(node) { return node.data.rows; },
        columnDefs: columnDefs,
        rowData: rowData,
        rowSelection: 'single',
        enableColResize: true,
        enableSorting: true,
        rowHeight: 20,
        angularCompileRows: true,
        icons: {
            groupExpanded: '<i class="fa fa-minus-square-o"/>',
            groupContracted: '<i class="fa fa-plus-square-o"/>'
        },
        rowClicked: rowClicked,
        groupInnerRenderer: groupInnerRendererFunc
    };

    $scope.moveUp = function() {
          var selects = $scope.gridOptions.api.getSelectedNodes();
          if (selects.length == 1)
          {
            var id = selects[0].id;
            if (id < 1) return;
            var element = $scope.gridOptions.rowData[id];
            $scope.gridOptions.rowData.splice(id, 1);
            $scope.gridOptions.rowData.splice(id-1, 0, element);
            $scope.gridOptions.api.onNewRows();
            $scope.gridOptions.api.selectIndex(id-1);
          }
        };
    $scope.moveDown = function() {
          var selects = $scope.gridOptions.api.getSelectedNodes();
          if (selects.length == 1)
          {
            var id = selects[0].id;
            if (id >= $scope.gridOptions.rowData.length-1) return;
            var element = $scope.gridOptions.rowData[id];
            $scope.gridOptions.rowData.splice(id, 1);
            $scope.gridOptions.rowData.splice(id+1, 0, element);
            $scope.gridOptions.api.onNewRows();
            $scope.gridOptions.api.selectIndex(id+1);
          }
        }
    $scope.selectedFile = 'Select a file below...';

    function rowClicked(params) {
        var node = params.node;
        var path = node.data.name;
        while (node.parent) {
            node = node.parent;
            path = node.data.name + '\\' + path;
        }
        $scope.selectedFile = path;
        $scope.gridOptions.api.selectIndex(params.rowIndex);
    }

    function sizeCellStyle() {
        return {'text-align': 'right'};
    }

    function innerCellRenderer(params) {
        var eGroupCell = document.createElement('div');
        eGroupCell.style.backgroundColor = 'red';
        eGroupCell.style.height = '100%';
        var node = params.node;


        var eText = document.createElement('div');
        eText.innerHTML = '2 + 1 = {{ 2 + 1 }}'
        eGroupCell.appendChild(eText);

        return eGroupCell;
    }

    function groupInnerRendererFunc(params) {
        return params.node.data.name;
    }

});
