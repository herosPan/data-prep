import { actions } from '@talend/react-cmf';
import { put, take } from 'redux-saga/effects';
import { CLOSE_ABOUT, OPEN_ABOUT } from '../constants';

export function* openAboutSaga() {
	while (true) {
		yield take(OPEN_ABOUT);
		yield put(actions.components.mergeState('AboutModal', 'default', { show: true }));
	}
}
