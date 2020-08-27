import StepMachine from '../index';

interface State {
  tosAccepted: boolean;
  requireDate: boolean;
  dateSelected: boolean;
  timeSelected: boolean;
}

const showTos = jest.fn();
const hideTos = jest.fn();
const popModal = jest.fn();
const initDateSelect = jest.fn();
const tearDownDateSelect = jest.fn();
const initTimeSelect = jest.fn();
const tearDownTimeSelect = jest.fn();

let state: State;
let machine: StepMachine;

const newState = (): State => ({
  tosAccepted: false,
  requireDate: true,
  dateSelected: false,
  timeSelected: false,
});

const newMachine = (): StepMachine => {
  return new StepMachine([
    {
      step: 'termsOfService',
  
      completedIf: () => {
        return state.tosAccepted;
      },
  
      onEnter: (_machine) => {
        showTos();
      },
  
      onLeave: (_machine) => {
        hideTos();
      },
    },
    {
      step: 'rejectedTermsOfService',
  
      onEnter: (_machine) => {
        popModal("You must accept the terms of service to continue");
      },
    },
    {
      step: 'date',
  
      dependencies: [
        'termsOfService',
      ],
  
      completedIf: () => {
        return state.dateSelected;
      },
  
      onEnter: (machine) => {
        if (machine.completed) {
          machine.goTo('time', { skipOnLeaveCurrentStep: true });
        } else {
          initDateSelect();
        }
      },
  
      onLeave: (_machine) => {
        tearDownDateSelect();
      },
    },
    {
      step: 'time',
  
      dependencies: () => {
        return state.requireDate ? ['date'] : ['termsOfService'];
      },
  
      completedIf: () => {
        return state.timeSelected;
      },
  
      onEnter: (machine) => {
        if (machine.completed) {
          machine.goTo('finished', { skipOnLeaveCurrentStep: true });
        } else {
          initTimeSelect();
        }
      },
  
      onLeave: (_machine) => {
        tearDownTimeSelect();
      },
    },
    {
      step: 'finished',
  
      dependencies: () => {
        return state.requireDate ? ['date', 'time'] : ['time'];
      },
  
      onEnter: (_machine) => {
        popModal("You're finished!");
      },
    },
  ]);
};

const setup = (): void => {
  state = newState();
  machine = newMachine();
};

beforeEach(() => {
  setup();
});

test("starts out without a step", () => {
  expect(machine.currentStep).toBeNull();
});

test("allows moving to the first step", () => {
  expect(machine.currentStep).toBeNull();

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
});

test("disallows moving to a step if its dependencies aren't completed", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.tosAccepted).toBeFalsy();

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('date');
  expect(machine.currentStep).toEqual('termsOfService');
});

test("allows moving to a step if its dependencies are completed", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.tosAccepted).toBeFalsy();

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');

  state.tosAccepted = true;
  machine.goTo('date');
  expect(machine.currentStep).toEqual('date');
});

test("disallows moving to a step if its dependencies are completed but the dependencies of its dependencies are not all completed", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  state.dateSelected = true;

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
  expect(machine.completed).toBeFalsy(); // requires `state.tosAccepted === true` to be complete

  machine.goTo('date');
  expect(machine.currentStep).toEqual('termsOfService'); // "date" step directly depends on "termsOfService", which isn't complete

  expect(state.dateSelected).toBeTruthy();
  machine.goTo('time');
  // "time" step directly depends on "date", which is technically complete since
  // `state.dateSelected === true`, but it also depends on "termsOfService"
  // (through "date") and that one ISN'T complete
  expect(machine.currentStep).toEqual('termsOfService');
});

test("allows moving to a step if its dependencies are completed AND the dependencies of its dependencies are all completed", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
  expect(state.tosAccepted).toBeFalsy();
  expect(machine.completed).toBeFalsy();
  machine.goTo('date'); // should fail
  expect(machine.currentStep).toEqual('termsOfService');
  state.tosAccepted = true; // now it can go
  expect(machine.completed).toBeTruthy();

  machine.goTo('date');
  expect(machine.currentStep).toEqual('date');
  expect(state.dateSelected).toBeFalsy();
  expect(machine.completed).toBeFalsy();
  machine.goTo('time'); // should fail
  expect(machine.currentStep).toEqual('date');
  state.dateSelected = true; // now it can go
  expect(machine.completed).toBeTruthy();

  machine.goTo('time');
  expect(machine.currentStep).toEqual('time');
  expect(state.timeSelected).toBeFalsy();
  expect(machine.completed).toBeFalsy();
  machine.goTo('finished'); // should fail
  expect(machine.currentStep).toEqual('time');
  state.timeSelected = true; // now it can go
  expect(machine.completed).toBeTruthy();

  machine.goTo('finished');
  expect(machine.currentStep).toEqual('finished');
});

test("cannot skip around, unrestricted, if dependencies aren't satisfied", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  state.tosAccepted = true;
  state.dateSelected = true;
  state.timeSelected = false;

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');
  
  machine.goTo('time', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('time');

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('date', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('date');
});

test("can skip around as long as dependencies are satisfied", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  state.tosAccepted = true;
  state.dateSelected = true;
  state.timeSelected = true;

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');
  
  machine.goTo('time', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('time');

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('finished');

  machine.goTo('date', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('date');
});

test("falls back to the last incomplete dependency step by default if dependencies aren't all satisfied", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  state.tosAccepted = true;
  state.dateSelected = false;
  state.timeSelected = false;

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('date');

  state.dateSelected = true;
  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('time');

  state.timeSelected = true;
  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('finished');
});

test("does not change step at all if dependencies aren't all satisfied and `fallBackToLastIncompleteDependency: false` is provided", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  state.tosAccepted = true;
  state.dateSelected = false;
  state.timeSelected = false;

  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  state.dateSelected = true;
  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('termsOfService');

  state.timeSelected = true;
  machine.goTo('finished', { skipOnLeaveCurrentStep: true, skipOnEnterNextStep: true, fallBackToLastIncompleteDependency: false });
  expect(machine.currentStep).toEqual('finished');
});

test("can skip steps internally using `goTo` within the `onEnter` transition callback", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  state.tosAccepted = true;
  state.dateSelected = true;
  state.timeSelected = true;

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('date');
  expect(machine.currentStep).toEqual('finished');

  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');

  machine.goTo('time');
  expect(machine.currentStep).toEqual('finished');
});

test("the `onEnter` callback is invoked after entering a step and `onLeave` is invoked before leaving a step", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  expect(state.dateSelected).toBeFalsy();
  expect(state.timeSelected).toBeFalsy();

  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
  expect(showTos.mock.calls.length).toEqual(1); // "termsOfService" `onEnter`
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(initDateSelect.mock.calls.length).toEqual(0);
  state.tosAccepted = true;
  machine.goTo('date');
  expect(machine.currentStep).toEqual('date');
  expect(hideTos.mock.calls.length).toEqual(1); // "termsOfService" `onLeave`
  expect(initDateSelect.mock.calls.length).toEqual(1); // "date" `onEnter`
});

test("the `onEnter` callback is not invoked after entering a step if `skipOnEnterNextStep` option is provided to `goTo`", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  expect(state.dateSelected).toBeFalsy();
  expect(state.timeSelected).toBeFalsy();

  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService', { skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('termsOfService');
  expect(showTos.mock.calls.length).toEqual(0); // "termsOfService" `onEnter`
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(initDateSelect.mock.calls.length).toEqual(0);
  state.tosAccepted = true;
  machine.goTo('date', { skipOnEnterNextStep: true });
  expect(machine.currentStep).toEqual('date');
  expect(hideTos.mock.calls.length).toEqual(1); // "termsOfService" `onLeave`
  expect(initDateSelect.mock.calls.length).toEqual(0); // "date" `onEnter`
});

test("the `onLeave` callback is not invoked after entering a step if `skipOnLeaveCurrentStep` option is provided to `goTo`", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  expect(state.dateSelected).toBeFalsy();
  expect(state.timeSelected).toBeFalsy();

  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService', { skipOnLeaveCurrentStep: true });
  expect(machine.currentStep).toEqual('termsOfService');
  expect(showTos.mock.calls.length).toEqual(1); // "termsOfService" `onEnter`
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(initDateSelect.mock.calls.length).toEqual(0);
  state.tosAccepted = true;
  machine.goTo('date', { skipOnLeaveCurrentStep: true });
  expect(machine.currentStep).toEqual('date');
  expect(hideTos.mock.calls.length).toEqual(0); // "termsOfService" `onLeave`
  expect(initDateSelect.mock.calls.length).toEqual(1); // "date" `onEnter`
});

test("neither `onEnter` nor `onLeave` are invoked if both transition callback skip options are provided to `goTo`", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  expect(state.dateSelected).toBeFalsy();
  expect(state.timeSelected).toBeFalsy();

  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService', { skipOnEnterNextStep: true, skipOnLeaveCurrentStep: true });
  expect(machine.currentStep).toEqual('termsOfService');
  expect(showTos.mock.calls.length).toEqual(0); // "termsOfService" `onEnter`
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(initDateSelect.mock.calls.length).toEqual(0);
  state.tosAccepted = true;
  machine.goTo('date', { skipOnEnterNextStep: true, skipOnLeaveCurrentStep: true });
  expect(machine.currentStep).toEqual('date');
  expect(hideTos.mock.calls.length).toEqual(0); // "termsOfService" `onLeave`
  expect(initDateSelect.mock.calls.length).toEqual(0); // "date" `onEnter`
});

test("neither `onEnter` nor `onLeave` are invoked if the step provided to `goTo` is the same as the current step", () => {
  expect(machine.currentStep).toBeNull();
  expect(state.requireDate).toBeTruthy();
  expect(state.tosAccepted).toBeFalsy();
  expect(state.dateSelected).toBeFalsy();
  expect(state.timeSelected).toBeFalsy();

  machine.goTo('termsOfService', { skipOnEnterNextStep: true, skipOnLeaveCurrentStep: true });
  expect(machine.currentStep).toEqual('termsOfService');
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
  expect(hideTos.mock.calls.length).toEqual(0); // "termsOfService" `onLeave`
  expect(showTos.mock.calls.length).toEqual(0); // "termsOfService" `onEnter`
  
  expect(hideTos.mock.calls.length).toEqual(0);
  expect(showTos.mock.calls.length).toEqual(0);
  machine.goTo('termsOfService');
  expect(machine.currentStep).toEqual('termsOfService');
  expect(hideTos.mock.calls.length).toEqual(0); // "termsOfService" `onLeave`
  expect(showTos.mock.calls.length).toEqual(0); // "termsOfService" `onEnter`
});
