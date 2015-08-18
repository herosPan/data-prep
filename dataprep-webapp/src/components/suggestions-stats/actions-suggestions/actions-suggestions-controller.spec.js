/*jshint camelcase: false */
describe('Actions suggestions-stats controller', function () {
    'use strict';

    var createController, scope;

    beforeEach(module('data-prep.actions-suggestions'));

    beforeEach(inject(function ($rootScope, $controller, $q, PlaygroundService, TransformationService, RecipeService, PreviewService) {
        scope = $rootScope.$new();

        createController = function () {
            var ctrl = $controller('ActionsSuggestionsCtrl', {
                $scope: scope
            });
            return ctrl;
        };

        spyOn(PlaygroundService, 'appendStep').and.returnValue($q.when());
        spyOn(TransformationService, 'initDynamicParameters').and.returnValue($q.when());
        spyOn(RecipeService, 'earlyPreview').and.returnValue();
        spyOn(RecipeService, 'cancelEarlyPreview').and.returnValue();
        spyOn(PreviewService, 'getPreviewAddRecords').and.returnValue();
        spyOn(PreviewService, 'cancelPreview').and.returnValue();
    }));

    it('should init vars and flags', inject(function () {
        //when
        var ctrl = createController();

        //then
        expect(ctrl.dynamicTransformation).toBe(null);
        expect(ctrl.showModalContent).toBe(null);
        expect(ctrl.dynamicFetchInProgress).toBe(false);
        expect(ctrl.showDynamicModal).toBe(false);
    }));

    it('should bind "column" getter to ColumnSuggestionService.currentColumn', inject(function (ColumnSuggestionService) {
        //given
        var ctrl = createController();
        var column = {id: '0001', name: 'col1'};

        //when
        ColumnSuggestionService.currentColumn = column;

        //then
        expect(ctrl.column).toBe(column);
    }));

    it('should bind "suggestions-stats" getter to ColumnSuggestionService.transformations', inject(function (ColumnSuggestionService) {
        //given
        var ctrl = createController();
        var transformations = [{name: 'tolowercase'}, {name: 'touppercase'}];

        //when
        ColumnSuggestionService.transformations = transformations;

        //then
        expect(ctrl.columnSuggestions).toBe(transformations);
    }));

    describe('with initiated state', function () {
        var column = {id: '0001', name: 'col1'};

        beforeEach(inject(function (ColumnSuggestionService, PlaygroundService, PreparationService) {
            ColumnSuggestionService.currentColumn = column;
            PlaygroundService.currentMetadata = {id: 'dataset_id'};
            PreparationService.currentPreparationId = 'preparation_id';
        }));

        it('should call appendStep function on transform closure execution', inject(function (PlaygroundService) {
            //given
            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var params = {param: 'value'};
            var ctrl = createController();

            //when
            var closure = ctrl.transformClosure(transformation, transfoScope);
            closure(params);

            //then
            var expectedParams = {
                param: 'value',
                scope: transfoScope,
                column_id: column.id,
                column_name: column.name
            };
            expect(PlaygroundService.appendStep).toHaveBeenCalledWith('tolowercase', expectedParams);
        }));

        it('should hide modal after step append', inject(function ($rootScope) {
            //given
            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var params = {param: 'value'};
            var ctrl = createController();
            ctrl.showDynamicModal = true;

            //when
            var closure = ctrl.transformClosure(transformation, transfoScope);
            closure(params);
            $rootScope.$digest();

            //then
            expect(ctrl.showDynamicModal).toBe(false);
        }));

        it('should append new step on static transformation selection', inject(function (PlaygroundService) {
            //given
            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var ctrl = createController();

            //when
            ctrl.select(transformation, transfoScope);

            //then
            var expectedParams = {
                scope: transfoScope,
                column_id: column.id,
                column_name: column.name
            };
            expect(PlaygroundService.appendStep).toHaveBeenCalledWith('tolowercase', expectedParams);
        }));

        it('should set current dynamic transformation and scope on dynamic transformation selection', inject(function () {
            //given
            var transformation = {name: 'cluster', dynamic: true};
            var ctrl = createController();
            ctrl.dynamicTransformation = null;

            //when
            ctrl.select(transformation, 'column');

            //then
            expect(ctrl.dynamicTransformation).toBe(transformation);
            expect(ctrl.dynamicScope).toBe('column');
        }));

        it('should init dynamic params on dynamic transformation selection', inject(function (TransformationService) {
            //given
            var transformation = {name: 'cluster', dynamic: true};

            var ctrl = createController();

            //when
            ctrl.select(transformation, 'column');

            //then
            expect(TransformationService.initDynamicParameters).toHaveBeenCalledWith(transformation, {
                columnId: '0001',
                datasetId: 'dataset_id',
                preparationId: 'preparation_id'
            });
        }));

        it('should update fetch progress flag during dynamic parameters init', inject(function ($rootScope) {
            //given
            var transformation = {name: 'cluster', dynamic: true};
            var ctrl = createController();
            ctrl.dynamicFetchInProgress = false;

            //when
            ctrl.select(transformation, 'column');
            expect(ctrl.dynamicFetchInProgress).toBe(true);
            $rootScope.$digest();

            //then
            expect(ctrl.dynamicFetchInProgress).toBe(false);
        }));

        it('should show NO CLUSTERS WERE FOUND message', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {name: 'cluster', dynamic: true, cluster: {clusters: []}};

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(false);
            expect(ctrl.emptyParamsMsg).toEqual('NO_CLUSTERS_ACTION_MSG');
        }));

        it('should show NO CHOICES WERE FOUND message', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {name: 'choices', dynamic: true, parameters: []};

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(false);
            expect(ctrl.emptyParamsMsg).toEqual('NO_CHOICES_ACTION_MSG');
        }));

        it('should show NO SIMPLE PARAMS WERE FOUND message', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {name: 'items', dynamic: true, items: []};

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(false);
            expect(ctrl.emptyParamsMsg).toEqual('NO_PARAMS_ACTION_MSG');
        }));

        it('should show dynamic cluster transformation in a modal', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {
                name: 'cluster',
                dynamic: true,
                cluster: {clusters: [{parameters: [], replace: {}}]}
            };

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(true);
        }));

        it('should show dynamic parameters transformation in a modal', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {name: 'items', dynamic: true, items: [1, 2]};

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(true);
        }));

        it('should show dynamic choices transformation in a modal', inject(function () {
            //given
            var ctrl = createController();
            ctrl.dynamicTransformation = {name: 'items', dynamic: true, parameters: [1, 2]};

            //when
            ctrl.checkDynamicResponse();

            //then
            expect(ctrl.showModalContent).toBe(true);
        }));
    });

    describe('early preview', function () {
        var currentMetadata = {id: '123456'};
        var column = {id: '0001', name: 'firstname'};
        var transfoScope;
        var transformation;
        var params;

        beforeEach(inject(function(ColumnSuggestionService, PlaygroundService) {
            ColumnSuggestionService.currentColumn = column;
            PlaygroundService.currentMetadata = currentMetadata;

            transfoScope = 'column';
            transformation = {
                name: 'replace_on_value'
            };
            params = {
                value: 'James',
                replace: 'Jimmy'
            };
        }));

        it('should add the new preview step in recipe after a 300ms delay', inject(function ($timeout, RecipeService) {
            //given
            var ctrl = createController();

            //when
            ctrl.earlyPreview(transformation, transfoScope)(params);
            expect(RecipeService.earlyPreview).not.toHaveBeenCalled();
            $timeout.flush(300);

            //then
            expect(RecipeService.earlyPreview).toHaveBeenCalledWith(
                ctrl.column,
                transformation,
                {
                    value: 'James',
                    replace: 'Jimmy',
                    scope: transfoScope,
                    column_id: '0001',
                    column_name: 'firstname'
                }
            );
        }));

        it('should trigger grid preview after a 300ms delay', inject(function ($timeout, PreviewService) {
            //given
            var ctrl = createController();

            //when
            ctrl.earlyPreview(transformation, transfoScope)(params);
            expect(PreviewService.getPreviewAddRecords).not.toHaveBeenCalled();
            $timeout.flush(300);

            //then
            expect(PreviewService.getPreviewAddRecords).toHaveBeenCalledWith(
                currentMetadata.id,
                'replace_on_value',
                {
                    value: 'James',
                    replace: 'Jimmy',
                    scope: transfoScope,
                    column_id: column.id,
                    column_name: column.name
                }
            );
        }));

        it('should cancel pending early preview', inject(function ($timeout, RecipeService, PreviewService) {
            //given
            var ctrl = createController();

            ctrl.earlyPreview(transformation, transfoScope)(params);
            expect(RecipeService.earlyPreview).not.toHaveBeenCalled();
            expect(PreviewService.getPreviewAddRecords).not.toHaveBeenCalled();

            //when
            ctrl.cancelEarlyPreview();
            $timeout.flush();

            //then
            expect(RecipeService.earlyPreview).not.toHaveBeenCalled();
            expect(PreviewService.getPreviewAddRecords).not.toHaveBeenCalled();
        }));

        it('should cancel current early preview after a 100ms delay', inject(function ($timeout, RecipeService, PreviewService) {
            //given
            var ctrl = createController();

            //when
            ctrl.cancelEarlyPreview();
            expect(RecipeService.cancelEarlyPreview).not.toHaveBeenCalled();
            expect(PreviewService.cancelPreview).not.toHaveBeenCalled();
            $timeout.flush(100);

            //then
            expect(RecipeService.cancelEarlyPreview).toHaveBeenCalled();
            expect(PreviewService.cancelPreview).toHaveBeenCalled();
        }));

        it('should disable early preview on step append', inject(function ($timeout, PreviewService) {
            //given
            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var params = {param: 'value'};
            var ctrl = createController();

            //when
            var closure = ctrl.transformClosure(transformation, transfoScope);
            closure(params);

            //then : preview should be disabled
            ctrl.earlyPreview(transformation, transfoScope)(params);
            $timeout.flush();
            expect(PreviewService.getPreviewAddRecords).not.toHaveBeenCalled();
        }));

        it('should disable early preview cancel on step append', inject(function ($timeout, RecipeService, PreviewService) {
            //given
            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var params = {param: 'value'};
            var ctrl = createController();

            //when
            var closure = ctrl.transformClosure(transformation, transfoScope);
            closure(params);

            //then : preview should be disabled
            ctrl.cancelEarlyPreview();
            $timeout.flush();
            expect(RecipeService.cancelEarlyPreview).not.toHaveBeenCalled();
            expect(PreviewService.cancelPreview).not.toHaveBeenCalled();
        }));

        it('should enable early preview after step append (with a 500ms delay)', inject(function ($timeout, PreviewService) {
            //given
            jasmine.clock().install();

            var transformation = {name: 'tolowercase'};
            var transfoScope = 'column';
            var params = {param: 'value'};
            var ctrl = createController();

            //when
            var closure = ctrl.transformClosure(transformation, transfoScope);
            closure(params);
            scope.$digest();

            //then : preview should still be disabled
            ctrl.earlyPreview(transformation, transfoScope)(params);
            $timeout.flush();
            expect(PreviewService.getPreviewAddRecords).not.toHaveBeenCalled();

            //then : preview should be enabled after 500ms
            jasmine.clock().tick(500);
            ctrl.earlyPreview(transformation, transfoScope)(params);
            $timeout.flush();
            expect(PreviewService.getPreviewAddRecords).toHaveBeenCalled();

            jasmine.clock().uninstall();
        }));
    });
});
