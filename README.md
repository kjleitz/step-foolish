# step-foolish

Simple step-wise state machine management.

## Installation

```
yarn add step-foolish
```

...or:

```
npm install step-foolish
```

## TypeScript

Types are already provided.

## Example usage

```ts
import StepMachine from 'step-foolish';

// Some example state to represent a real-world application/component state.
const state = {
  tosAccepted: false,
  requireDate: true,
  dateSelected: false,
  timeSelected: false,
};

const machine = new StepMachine([
  {
    // Name of this step
    step: 'termsOfService',

    // Function which returns a boolean indicating whether or not this step can
    // be considered "completed"
    completedIf: () => state.tosAccepted,

    // Callback function which is called immediately after entering this step;
    // "setup" logic can go here, for example. Invocation of this function will
    // happen by default when calling, e.g., `goTo('termsOfService')`. It can be
    // skipped by providing the `skipOnEnterNextStep: true` option to `goTo`.
    // See the other steps below for a description of the argument that's passed
    // to `onEnter`.
    onEnter(_machine) {
      showTos();
    },

    // Callback function which is called immediately before leaving this step;
    // "teardown" logic can go here, for example. Invocation of this function
    // will happen by default when calling, e.g., `goTo('date')` while the
    // current step is "termsOfService". It can be skipped by providing the
    // `skipOnLeaveCurrentStep: true` option to `goTo`. See the other steps
    // below for a description of the argument that's passed to `onLeave`.
    onLeave(_machine) {
      hideTos();
    },
  },
  {
    step: 'date',

    // Dependencies for this step; this step cannot be entered unless all of its
    // listed dependency steps (and the dependencies of those dependency steps)
    // are "completed". By default, if not all dependencies are completed, a
    // call to `goTo` will fall back to the farthest-along dependency that isn't
    // completed. For example, if "termsOfService" is not yet completed, calling
    // `goTo('date')` will result in the machine going to the "termsOfService"
    // step. Only the final calculated step will have its `onEnter` callback
    // invoked (the `onEnter`/`onLeave` callbacks will not be invoked when
    // walking the dependency tree for a step). This behavior can be
    // circumvented by passing the `fallBackToLastIncompleteDependency: false`
    // option to `goTo`. By using that option, the `goTo` would simply fail to
    // switch steps and remain on whatever step it was on before the call to
    // `goTo`.
    dependencies: [
      'termsOfService',
    ],

    completedIf: () => state.dateSelected,

    onEnter(machine) {
      // The `machine` argument passed to `onEnter` will be a `StepMachine`
      // instance (the same instance as the one being instantiated here). Inside
      // the `onEnter` function, `machine` will have the following properties:
      //
      //   machine.previousStep => the string name of the step the machine just
      //                           left from (`null` if this step is the first
      //                           step being entered)
      //
      //   machine.currentStep  => the string name of the step the machine just
      //                           entered into (this step's name: "date")
      //
      //   machine.nextStep     => always `null` in the `onEnter` callback
      //
      //   machine.completed    => a boolean; `true` if the current step is
      //                           already completed upon entry
      //
      if (machine.completed) {
        machine.goTo('time', { skipOnLeaveCurrentStep: true });
      } else {
        initDateSelect();
      }
    },

    onLeave(machine) {
      // The `machine` argument passed to `onLeave` will be a `StepMachine`
      // instance (the same instance as the one being instantiated here). Inside
      // the `onLeave` function, `machine` will have the following properties:
      //
      //   machine.previousStep => the string name of the step the machine LAST
      //                           left from, before having entered this step
      //                           (`null` if this was the first step ever
      //                           entered)
      //
      //   machine.currentStep  => the string name of the step the machine is
      //                           leaving from (this step's name: "date")
      //
      //   machine.nextStep     => the string name of the step the machine is
      //                           going to enter next (i.e., the step name
      //                           passed to `goTo`, which triggered this
      //                           `onLeave` function)
      //
      //   machine.completed    => a boolean; `true` if the current step is
      //                           completed at the time `onLeave` is called
      //
      if (!machine.completed) {
        popModal("Remember to come back and select a date!");
      }

      tearDownDateSelect();
    },
  },
  {
    step: 'time',

    // The `dependencies` option can, alternatively, be a function that returns
    // an array of step names, if dynamism is required.
    dependencies() {
      return state.requireDate ? ['date'] : ['termsOfService'];
    },

    completedIf: () => state.timeSelected,

    onEnter(machine) {
      if (machine.completed) {
        // Since the `machine` argument passed to `onEnter`/`onLeave` is just
        // a `StepMachine` instance, you can use `goTo` in these callbacks, too.
        // You might choose to use it here if this step should be automatically
        // "skipped" if some condition is satisfied. As previously mentioned,
        // you can prevent this step's `onLeave` callback from being invoked
        // using the `skipOnLeaveCurrentStep: true` option.
        machine.goTo('finished', { skipOnLeaveCurrentStep: true });
      } else {
        initTimeSelect();
      }
    },

    onLeave(_machine) {
      tearDownTimeSelect();
    },
  },
  {
    step: 'finished',

    dependencies() {
      return state.requireDate ? ['date', 'time'] : ['time'];
    },

    onEnter(_machine) {
      popModal("You're finished!");
    },
  },
]);

console.log(machine.currentStep); //=> `null` (does not start out on any step by
                                  //   default)

machine.goTo('termsOfService');
// (`showTos()` happens here)
console.log(machine.currentStep); //=> "termsOfService"

machine.goTo('date');             // can't go to "date" yet because
                                  // `state.tosAccepted` is `false`
console.log(machine.currentStep); //=> "termsOfService"

state.tosAccepted = true;         // now it can go to "date"

machine.goTo('date');
// (`hideTos()` happens here)
// (`initDateSelect()` happens here)
console.log(machine.currentStep); //=> "date"

machine.goTo('termsOfService');   // we'll go back to "termsOfService"
// (`popModal("Remember to come back and select a date!")` and
// `tearDownDateSelect()` both happen here)
// (`showTos()` happens here)
console.log(machine.currentStep); //=> "termsOfService"

state.dateSelected = true;        // now that `state.tosAccepted` and
                                  // `state.dateSelected` are both true, it
                                  // could go to "time" if it wanted, but since
                                  // `state.timeSelected` is still false, it
                                  // can't yet go to "finished"

machine.goTo('finished');         // let's try going to "finished" anyway...
// (`hideTos()` happens here)
// (`initTimeSelect()` happens here)
console.log(machine.currentStep); //=> "time" (that's the farthest-along not-
                                  //   yet-completed dependency for "finished")

state.timeSelected = true;        // now it can go to "finished"

machine.goTo('finished');
// (`tearDownTimeSelect()` happens here)
// (`popModal("You're finished!")` happens here)
console.log(machine.currentStep); //=> "finished"
```

## Contributing

Bug reports and pull requests for this project are welcome at its [GitHub page](https://github.com/kjleitz/step-foolish). If you choose to contribute, please be nice so I don't have to run out of bubblegum, etc.

## License

This project is open source, under the terms of the [MIT License](https://github.com/kjleitz/step-foolish/blob/master/LICENSE).
