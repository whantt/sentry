import React from 'react';

import {t} from 'app/locale';
import {Event, Project} from 'app/types';
import {STACK_TYPE, STACK_VIEW} from 'app/types/stacktrace';
import {defined} from 'app/utils';
import {isStacktraceNewestFirst} from 'app/components/events/interfaces/stacktrace';
import EventDataSection from 'app/components/events/eventDataSection';
import CrashTitle from 'app/components/events/interfaces/crashHeader/crashTitle';
import CrashActions from 'app/components/events/interfaces/crashHeader/crashActions';
import {ThreadType} from 'app/types/events';

import ThreadSelector from './threadSelector';
import getThreadStacktrace from './threadSelector/getThreadStacktrace';
import getThreadException from './threadSelector/getThreadException';
import Thread from './thread';

const defaultProps = {
  hideGuide: false,
};

type Props = {
  event: Event;
  projectId: Project['id'];
  type: string;
  data: ThreadType;
} & typeof defaultProps;

type State = {
  activeThread: any;
  stackView: STACK_VIEW;
  stackType: STACK_TYPE;
  newestFirst: boolean;
};

function getIntendedStackView(thread: ThreadType, event: Event) {
  const stacktrace = getThreadStacktrace(thread, event, false);
  return stacktrace && stacktrace.hasSystemFrames ? STACK_VIEW.APP : STACK_VIEW.FULL;
}

function findBestThread(threads: Array<ThreadType>) {
  // Search the entire threads list for a crashed thread with stack
  // trace.
  return (
    threads.find(thread => thread.crashed) ||
    threads.find(thread => thread.stacktrace) ||
    threads[0]
  );
}

class ThreadInterface extends React.Component<Props, State> {
  static defaultProps = defaultProps;

  state: State = this.getInitialState();

  getInitialState() {
    const {data, event} = this.props;
    const thread = defined(data.values) ? findBestThread(data.values) : undefined;
    return {
      activeThread: thread,
      stackView: thread ? getIntendedStackView(thread, event) : undefined,
      stackType: 'original',
      newestFirst: isStacktraceNewestFirst(),
    } as State;
  }

  toggleStackView = (stackView: STACK_VIEW) => {
    this.setState({stackView});
  };

  getStacktrace = () => {
    const {activeThread, stackType} = this.state;
    const {event} = this.props;
    return getThreadStacktrace(activeThread, event, stackType !== STACK_TYPE.ORIGINAL);
  };

  getException = () => getThreadException(this.state.activeThread, this.props.event);

  onSelectNewThread = (thread: ThreadType) => {
    const {stackView} = this.state;
    let newStackView = stackView;
    if (stackView !== STACK_VIEW.RAW) {
      newStackView = getIntendedStackView(thread, this.props.event);
    }
    this.setState({
      activeThread: thread,
      stackView: newStackView,
      stackType: STACK_TYPE.ORIGINAL,
    });
  };

  handleChangeNewestFirst = ({newestFirst}: Pick<State, 'newestFirst'>) => {
    this.setState({newestFirst});
  };

  render() {
    const {data, event, projectId, hideGuide, type} = this.props;

    const threads = data.values || [];

    if (!threads.length) {
      return null;
    }

    const {stackView, stackType, newestFirst, activeThread} = this.state;

    const exception = this.getException();
    const stacktrace = this.getStacktrace();
    const hasThreads = threads.length > 1;

    return (
      <EventDataSection
        type={type}
        title={
          hasThreads ? (
            <CrashTitle
              title=""
              newestFirst={newestFirst}
              hideGuide={hideGuide}
              onChange={this.handleChangeNewestFirst}
              beforeTitle={
                <ThreadSelector
                  threads={threads}
                  activeThread={activeThread}
                  event={event}
                  onChange={this.onSelectNewThread}
                />
              }
            />
          ) : (
            <CrashTitle
              title={t('Stacktrace')}
              newestFirst={newestFirst}
              hideGuide={hideGuide}
              onChange={this.handleChangeNewestFirst}
            />
          )
        }
        actions={
          <CrashActions
            stackView={stackView}
            platform={event.platform}
            stacktrace={stacktrace}
            stackType={stackType}
            thread={hasThreads ? activeThread : undefined}
            exception={hasThreads ? exception : undefined}
          />
        }
        showPermalink={!hasThreads}
        wrapTitle={false}
      >
        <Thread
          data={activeThread}
          exception={exception as any}
          stackView={stackView}
          stackType={stackType}
          stacktrace={stacktrace}
          event={event}
          newestFirst={newestFirst}
          projectId={projectId}
        />
      </EventDataSection>
    );
  }
}

export default ThreadInterface;
