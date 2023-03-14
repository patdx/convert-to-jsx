import { action, extendObservable, makeAutoObservable, untracked } from 'mobx';
import { observer } from 'mobx-react-lite';
import Head from 'next/head';
import { fromPromise } from 'mobx-utils';

const EXAMPLE_INPUT_ANGULAR = `<div #myContainer>
  <div *ngFor="let item of items">
    <button autoFocus class="btn btn-primary" [class.d-block]="isFullscreen">
      Submit
    </button>
    <button
      *ngIf="canCancel"
      class="btn btn-danger"
      [class.d-block]="isFullscreen"
      (click)="handleCancel($event)"
    >
      Submit
    </button>
  </div>
</div>`;

const EXAMLE_INPUT_HANDLEBARS = `<div>
  <ul class="people_list">
  {{#each people}}
    <li>{{this}}</li>
  {{/each}}
  </ul>
</div>`;

type Compiler = 'angular' | 'handlebars';

type State = {
  compiler: Compiler;
  codeForCompiler: Record<Compiler, string>;
};

// const state = proxy<State>({
//   compiler: 'angular',
//   codeForCompiler: {
//     angular: EXAMPLE_INPUT_ANGULAR,
//     handlebars: EXAMLE_INPUT_HANDLEBARS,
//   },
// });

const state = (() => {
  const rootState = makeAutoObservable<State>({
    compiler: 'angular',
    codeForCompiler: {
      angular: EXAMPLE_INPUT_ANGULAR,
      handlebars: EXAMLE_INPUT_HANDLEBARS,
    },
  });

  const state = extendObservable(rootState, {
    get code() {
      const { codeForCompiler, compiler } = rootState;
      return codeForCompiler[compiler];
    },
    set code(text: string) {
      const { codeForCompiler, compiler } = rootState;
      codeForCompiler[compiler] = text;
    },
    get compiled() {
      const { compiler } = rootState;
      const { code } = state;
      // mark as "any" to break the infinite loop
      // const lastPromise = untracked(() => state.compiled) as any;
      return fromPromise<string>(
        Promise.resolve().then(async () => {
          try {
            let output: string;
            if (compiler === 'handlebars') {
              const { compile: compileHandlebarsToJsx } = await import(
                'handlebars-to-jsx'
              );
              output = compileHandlebarsToJsx(code ?? '');
            } else {
              const { compileAngularToJsx } = await import(
                '@ctj/angular-to-jsx'
              );
              output = compileAngularToJsx(code ?? '');
            }

            try {
              const { format } = await import('../utils/format');
              output = format(output);
            } catch (err) {
              console.log(err);
            }

            return output;
          } catch (err) {
            return String(err);
          }
        })
        // lastPromise
      );
    },
  });

  return state;
})();

const Home = observer(function Home() {
  return (
    <>
      <Head>
        <title>
          {state.compiler === 'angular'
            ? 'Convert Angular to React JSX'
            : 'Convert Handlebars to React JSX'}
        </title>
        {/* <link rel="icon" href="/favicon.ico" /> */}
      </Head>

      <div className="flex flex-col h-screen">
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="flex-1 flex flex-col">
            <select
              className="w-full flex-none"
              value={state.compiler}
              onChange={action((event) => {
                state.compiler = event.target.value as Compiler;
              })}
            >
              <option value="handlebars">Handlebars to React JSX</option>
              <option value="angular">Angular to React JSX</option>
            </select>
            <textarea
              className="block w-full flex-1 font-mono"
              placeholder={
                state.compiler === 'angular'
                  ? `Paste Angular HTML code here and JSX will be output on the right using custom Angular to JSX code`
                  : `Paste Handlebars code here and JSX will be output on the right using jsx-to-handlebars library`
              }
              value={state.code}
              onChange={action((event) => {
                state.code = event.target.value;
              })}
            ></textarea>
          </div>
          <textarea
            className="flex-1 font-mono"
            readOnly
            value={state.compiled.case({
              fulfilled: (value) => value,
              pending: () => 'Loading...',
              rejected: (err) => String(err),
            })}
          ></textarea>
        </div>

        <div className="flex-none flex justify-center items-center gap-1">
          <span>
            By{' '}
            <a
              className="text-blue-700 hover:underline"
              href="https://github.com/patdx"
            >
              @patdx
            </a>
          </span>
          &middot;
          <a
            className="text-blue-700 hover:underline"
            href="https://github.com/patdx/convert-to-jsx"
          >
            Source
          </a>
          &middot;
          <span>Conversion happens locally in your browser</span>
        </div>
      </div>
    </>
  );
});

export default Home;
