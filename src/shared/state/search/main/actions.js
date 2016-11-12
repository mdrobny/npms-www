import { push } from 'react-router-redux';
import queryString from 'query-string';
import uniqueId from 'lodash/uniqueId';
import npmsRequest from 'shared/util/npmsRequest';
import { markAsLoading, unmarkAsLoading } from 'shared/state/app/actions';

// TODO: store results in an LRU to improve integration with back button?

const resultsPerPage = 25;

function buildSearchUrl(params) {
    const queryStr = queryString.stringify({ q: params.q })
    .replace(/%20/g, '+');                // Replace spaces with + because it's prettier

    return `/search${queryStr ? `?${queryStr}` : ''}`;
}

function normalizeParams(params) {
    return {
        ...params,
        q: params.q.trim(),
    };
}

// --------------------------------------------------

export function updateQuery(q) {
    return {
        type: 'Search.Main.UPDATE_QUERY',
        payload: q,
    };
}

export function reset() {
    return {
        type: 'Search.Main.RESET',
    };
}

export function navigate() {
    return (dispatch, getState) => {
        const params = normalizeParams(getState().search.main.params);

        // Only navigate if we got a query filled in
        params.q && dispatch(push(buildSearchUrl(params)));
    };
}

export function run() {
    return (dispatch, getState) => {
        const params = normalizeParams(getState().search.main.params);

        // Reset if query is empty
        if (!params.q) {
            return dispatch(reset());
        }

        params.from = 0;

        dispatch(markAsLoading());

        dispatch({
            type: 'Search.Main.RUN',
            meta: { uid: uniqueId('search-') },
            payload: {
                data: params,
                promise: npmsRequest(`/search?${queryString.stringify(params)}`)
                .then((res) => ({ total: res.total, items: res.results }))
                .finally(() => dispatch(unmarkAsLoading())),
            },
        })
        .catch(() => {});  // Search.Main.RUN_REJECTED will be dispatched, so swallow any error
    };
}

export function scroll() {
    return (dispatch, getState) => {
        const state = getState().search.main;
        const from = state.results.items.length;

        if (state.isLoading || from >= state.results.total) {
            return;
        }

        const params = normalizeParams({
            ...state.params,
            ...{ from: state.results.items.length, size: resultsPerPage },
        });

        dispatch(markAsLoading());

        dispatch({
            type: 'Search.Main.SCROLL',
            meta: { uid: uniqueId('search') },
            payload: {
                data: params,
                promise: npmsRequest(`/search?${queryString.stringify(params)}`)
                .then((res) => ({ total: res.total, items: res.results }))
                .finally(() => dispatch(unmarkAsLoading())),
            },
        })
        .catch(() => {});  // Search.Main.SCROLL_REJECTED will be dispatched, so swallow any error
    };
}