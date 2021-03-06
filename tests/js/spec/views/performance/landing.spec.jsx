import React from 'react';
import {browserHistory} from 'react-router';

import {initializeOrg} from 'sentry-test/initializeOrg';
import {mountWithTheme} from 'sentry-test/enzyme';

import ProjectsStore from 'app/stores/projectsStore';
import PerformanceLanding, {FilterViews} from 'app/views/performance/landing';
import * as globalSelection from 'app/actionCreators/globalSelection';
import {DEFAULT_MAX_DURATION} from 'app/views/performance/trends/utils';

const FEATURES = ['transaction-event', 'performance-view'];

function initializeData(projects, query, features = FEATURES) {
  const organization = TestStubs.Organization({
    features,
    projects,
  });
  const initialData = initializeOrg({
    organization,
    router: {
      location: {
        query: query || {},
      },
    },
  });
  ProjectsStore.loadInitialData(initialData.organization.projects);
  return initialData;
}

function initializeTrendsData(query, addDefaultQuery = true) {
  const features = [...FEATURES, 'trends'];
  const projects = [
    TestStubs.Project({id: '1', firstTransactionEvent: false}),
    TestStubs.Project({id: '2', firstTransactionEvent: true}),
  ];
  const organization = TestStubs.Organization({
    features,
    projects,
  });

  const otherTrendsQuery = addDefaultQuery
    ? {
        query: `epm():>0.01 transaction.duration:>0 transaction.duration:<${DEFAULT_MAX_DURATION}`,
      }
    : {};

  const initialData = initializeOrg({
    organization,
    router: {
      location: {
        query: {
          ...otherTrendsQuery,
          ...query,
        },
      },
    },
  });
  ProjectsStore.loadInitialData(initialData.organization.projects);
  return initialData;
}

describe('Performance > Landing', function () {
  let eventsMock;
  let keyTransactionsMock;
  beforeEach(function () {
    browserHistory.push = jest.fn();
    jest.spyOn(globalSelection, 'updateDateTime');

    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/projects/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/tags/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-stats/',
      body: {data: [[123, []]]},
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/users/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/recent-searches/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/recent-searches/',
      method: 'POST',
      body: [],
    });
    eventsMock = MockApiClient.addMockResponse(
      {
        url: '/organizations/org-slug/eventsv2/',
        body: {
          meta: {
            user: 'string',
            transaction: 'string',
            'project.id': 'integer',
            epm: 'number',
            p50: 'number',
            p95: 'number',
            failure_rate: 'number',
            apdex_300: 'number',
            count_unique_user: 'number',
            user_misery_300: 'number',
          },
          data: [
            {
              transaction: '/apple/cart',
              'project.id': 1,
              user: 'uhoh@example.com',
              epm: 30,
              p50: 100,
              p95: 500,
              failure_rate: 0.1,
              apdex_300: 0.6,
              count_unique_user: 1000,
              user_misery_300: 122,
            },
          ],
        },
      },
      {
        predicate: (_, options) => {
          if (!options.hasOwnProperty('query')) {
            return false;
          } else if (!options.query.hasOwnProperty('field')) {
            return false;
          }
          return !options.query.field.includes('key_transaction');
        },
      }
    );
    MockApiClient.addMockResponse(
      {
        url: '/organizations/org-slug/eventsv2/',
        body: {
          meta: {
            user: 'string',
            transaction: 'string',
            'project.id': 'integer',
            epm: 'number',
            p50: 'number',
            p95: 'number',
            failure_rate: 'number',
            apdex_300: 'number',
            count_unique_user: 'number',
            user_misery_300: 'number',
          },
          data: [
            {
              key_transaction: 1,
              transaction: '/apple/cart',
              'project.id': 1,
              user: 'uhoh@example.com',
              epm: 30,
              p50: 100,
              p95: 500,
              failure_rate: 0.1,
              apdex_300: 0.6,
              count_unique_user: 1000,
              user_misery_300: 122,
            },
            {
              key_transaction: 0,
              transaction: '/apple/checkout',
              'project.id': 1,
              user: 'uhoh@example.com',
              epm: 30,
              p50: 100,
              p95: 500,
              failure_rate: 0.1,
              apdex_300: 0.6,
              count_unique_user: 1000,
              user_misery_300: 122,
            },
          ],
        },
      },
      {
        predicate: (_, options) => {
          if (!options.hasOwnProperty('query')) {
            return false;
          } else if (!options.query.hasOwnProperty('field')) {
            return false;
          }
          return options.query.field.includes('key_transaction');
        },
      }
    );
    keyTransactionsMock = MockApiClient.addMockResponse({
      url: '/organizations/org-slug/key-transactions/',
      body: {
        meta: {},
        data: [],
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/key-transactions-stats/',
      body: {
        data: [],
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-meta/',
      body: {
        count: 2,
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-trends/',
      body: {
        stats: {},
        events: {meta: {}, data: []},
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-trends-stats/',
      body: {
        stats: {},
        events: {meta: {}, data: []},
      },
    });
  });

  afterEach(function () {
    MockApiClient.clearMockResponses();
    ProjectsStore.reset();
    globalSelection.updateDateTime.mockRestore();
  });

  it('renders basic UI elements', async function () {
    const projects = [TestStubs.Project({firstTransactionEvent: true})];
    const data = initializeData(projects, {});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    // Check number of rendered tab buttons
    expect(wrapper.find('ButtonBar Button')).toHaveLength(2);

    // No onboarding should show.
    expect(wrapper.find('Onboarding')).toHaveLength(0);

    // Chart and Table should render.
    expect(wrapper.find('ChartFooter')).toHaveLength(1);
    expect(wrapper.find('Table')).toHaveLength(1);
  });

  it('renders onboarding state when the selected project has no events', async function () {
    const projects = [
      TestStubs.Project({id: 1, firstTransactionEvent: false}),
      TestStubs.Project({id: 2, firstTransactionEvent: true}),
    ];
    const data = initializeData(projects, {project: [1]});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    // onboarding should show.
    expect(wrapper.find('Onboarding')).toHaveLength(1);

    // Chart and table should not show.
    expect(wrapper.find('ChartFooter')).toHaveLength(0);
    expect(wrapper.find('Table')).toHaveLength(0);
  });

  it('does not render onboarding for "my projects"', async function () {
    const projects = [
      TestStubs.Project({id: '1', firstTransactionEvent: false}),
      TestStubs.Project({id: '2', firstTransactionEvent: true}),
    ];
    const data = initializeData(projects, {project: ['-1']});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    expect(wrapper.find('Onboarding')).toHaveLength(0);
  });

  it('forwards conditions to transaction summary', async function () {
    const projects = [TestStubs.Project({id: '1', firstTransactionEvent: true})];
    const data = initializeData(projects, {project: ['1'], query: 'sentry:yes'});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    const link = wrapper.find('[data-test-id="grid-editable"] GridBody Link').at(0);
    link.simulate('click', {button: 0});

    expect(data.router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          transaction: '/apple/cart',
          query: 'sentry:yes',
        }),
      })
    );
  });

  it('Default period for trends does not call updateDateTime', async function () {
    const data = initializeTrendsData({query: 'tag:value'}, false);
    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();
    expect(globalSelection.updateDateTime).toHaveBeenCalledTimes(0);
  });

  it('Navigating to trends does not modify statsPeriod when already set', async function () {
    const data = initializeTrendsData({
      query: `epm():>0.005 transaction.duration:>10 transaction.duration:<${DEFAULT_MAX_DURATION}`,
      statsPeriod: '24h',
    });

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    const trendsLink = wrapper.find('[data-test-id="landing-header-trends"]').at(0);
    trendsLink.simulate('click');

    expect(globalSelection.updateDateTime).toHaveBeenCalledTimes(0);

    expect(browserHistory.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          query: `epm():>0.005 transaction.duration:>10 transaction.duration:<${DEFAULT_MAX_DURATION}`,
          statsPeriod: '24h',
          view: 'TRENDS',
        },
      })
    );
  });

  it('Default page (transactions) without trends feature will not update filters if none are set', async function () {
    const projects = [
      TestStubs.Project({id: 1, firstTransactionEvent: false}),
      TestStubs.Project({id: 2, firstTransactionEvent: true}),
    ];
    const data = initializeData(projects, {view: undefined});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    expect(browserHistory.push).toHaveBeenCalledTimes(0);
  });

  it('Default page (transactions) with trends feature will not update filters if none are set', async function () {
    const data = initializeTrendsData({view: undefined}, false);

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    expect(browserHistory.push).toHaveBeenCalledTimes(0);
  });

  it('Visiting trends with trends feature will update filters if none are set', async function () {
    const data = initializeTrendsData({view: FilterViews.TRENDS}, false);

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    expect(browserHistory.push).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: {
          query: `epm():>0.01 transaction.duration:>0 transaction.duration:<${DEFAULT_MAX_DURATION}`,
          view: 'TRENDS',
        },
      })
    );
  });

  it('Changing views from all transactions to key transactions fires discover query', async function () {
    const data = initializeTrendsData({view: FilterViews.ALL_TRANSACTIONS}, false);

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    expect(eventsMock).toHaveBeenCalledTimes(1);
    expect(keyTransactionsMock).toHaveBeenCalledTimes(0);

    const changedViewData = initializeTrendsData(
      {view: FilterViews.KEY_TRANSACTIONS},
      false
    );

    wrapper.setProps({location: changedViewData.router.location});
    await tick();
    wrapper.update();

    expect(eventsMock).toHaveBeenCalledTimes(1);
    expect(keyTransactionsMock).toHaveBeenCalledTimes(1);
  });

  it('Tags are replaced with trends default query if navigating to trends', async function () {
    const data = initializeTrendsData(
      {view: FilterViews.ALL_TRANSACTIONS, query: 'device.family:Mac'},
      false
    );

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );
    await tick();
    wrapper.update();

    const trendsLink = wrapper.find('[data-test-id="landing-header-trends"]').at(0);
    trendsLink.simulate('click');

    expect(browserHistory.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          query: `epm():>0.01 transaction.duration:>0 transaction.duration:<${DEFAULT_MAX_DURATION}`,
          view: 'TRENDS',
        },
      })
    );
  });

  it('Navigating away from trends will remove extra tags from query', async function () {
    const data = initializeTrendsData(
      {
        view: FilterViews.TRENDS,
        query: `device.family:Mac epm():>0.01 transaction.duration:>0 transaction.duration:<${DEFAULT_MAX_DURATION}`,
      },
      false
    );

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );

    await tick();
    wrapper.update();

    browserHistory.push.mockReset();

    const byTransactionLink = wrapper
      .find('[data-test-id="landing-header-all_transactions"]')
      .at(0);
    byTransactionLink.simulate('click');

    expect(browserHistory.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          query: 'device.family:Mac',
          view: 'ALL_TRANSACTIONS',
        },
      })
    );
  });

  it('should render correctly if key transaction feature is off', async function () {
    const projects = [TestStubs.Project({firstTransactionEvent: true})];
    const data = initializeData(projects, {});

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );

    await tick();
    wrapper.update();

    // Check number of rendered tab buttons
    expect(wrapper.find('ButtonBar Button')).toHaveLength(2);

    // Check to see if the key transaction column is not there
    expect(wrapper.find('IconStar[data-test-id="key-transaction-header"]')).toHaveLength(
      0
    );
    expect(wrapper.find('IconStar[data-test-id="key-transaction-column"]')).toHaveLength(
      0
    );
  });

  it('should render correctly if key transaction feature is on', async function () {
    const projects = [TestStubs.Project({firstTransactionEvent: true})];
    const data = initializeData(projects, {}, [...FEATURES, 'key-transactions']);

    const wrapper = mountWithTheme(
      <PerformanceLanding
        organization={data.organization}
        location={data.router.location}
      />,
      data.routerContext
    );

    await tick();
    wrapper.update();

    // Check number of rendered tab buttons
    expect(wrapper.find('ButtonBar Button')).toHaveLength(1);

    // Check to see if the key transaction column is there
    expect(wrapper.find('IconStar[data-test-id="key-transaction-header"]')).toHaveLength(
      1
    );
    const keyTransactionColumns = wrapper.find(
      'IconStar[data-test-id="key-transaction-column"]'
    );
    expect(keyTransactionColumns).toHaveLength(2);
    expect(keyTransactionColumns.first().props().isSolid).toEqual(true);
    expect(keyTransactionColumns.last().props().isSolid).toEqual(false);
  });
});
