import { api, sagaRouter } from '@talend/react-cmf';
import { registerAllContainers } from '@talend/react-containers/lib/register';
import { all, call, fork } from 'redux-saga/effects';
import redirect from './actions/redirect';
import { fetchDataSets } from './actions/dataset';
import { fetchDataStores } from './actions/datastore';
import { fetchPreparations } from './actions/preparation';

import App from './components/App.container';

import { helpSagas } from './saga';
import { OPEN_ABOUT } from './constants';

const registerComponent = api.route.registerComponent;
const registerActionCreator = api.action.registerActionCreator;

export default {
	initialize() {
		/**
		 * Register components in CMF Components dictionary
		 */
		registerAllContainers();
		registerComponent('App', App);

		/**
		 * Register action creators in CMF Actions dictionary
		 */
		registerActionCreator('preparation:fetchAll', fetchPreparations);
		registerActionCreator('dataset:fetchAll', fetchDataSets);
		registerActionCreator('datastore:fetchAll', fetchDataStores);
		registerActionCreator('redirect', redirect);

		registerActionCreator('help:tour', () => { alert('TODO'); return { type: 'none' }; });
		registerActionCreator('help:about:open', () => ({ type: OPEN_ABOUT }));
		registerActionCreator('help:feedback:open', () => { alert('TODO'); return { type: 'none' }; });
	},

	runSagas(sagaMiddleware, history) {
		function* rootSaga() {
			yield all([
				fork(sagaRouter, history, {} /*TODO sagas per route*/),
				...helpSagas.map(saga => call(saga)),
			]);
		}
		sagaMiddleware.run(rootSaga);
	},
};
