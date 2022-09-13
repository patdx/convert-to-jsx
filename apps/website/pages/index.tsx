import Head from 'next/head';
import { compile as compileHandlebarsToJsx } from 'handlebars-to-jsx';
import { compileAngularToJsx } from '@ctj/angular-to-jsx';
import { useState } from 'react';
import { format } from 'prettier';
import parserBabel from 'prettier/parser-babel';

const EXAMPLE_INPUT = `<div #myContainer>
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

export default function Home() {
  const [compiler, setCompiler] = useState('angular');
  const [code, setCode] = useState<string | undefined>(EXAMPLE_INPUT);

  let output = (() => {
    try {
      if (compiler === 'handlebars') {
        return compileHandlebarsToJsx(code ?? '');
      } else {
        return compileAngularToJsx(code ?? '');
      }
    } catch (err) {
      return String(err);
    }
  })();

  try {
    output = format(output, {
      parser: 'babel',
      plugins: [parserBabel],
      singleQuote: true,
    });
  } catch (err) {
    console.log(err);
  }

  return (
    <>
      <Head>
        <title>Convert Handlebars</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col h-screen">
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="flex-1 flex flex-col">
            <select
              className="w-full flex-none"
              value={compiler}
              onChange={(event) => setCompiler(event.target.value)}
            >
              <option value="handlebars">Handlebars to JSX</option>
              <option value="angular">Angular to JSX</option>
            </select>
            <textarea
              className="block w-full flex-1 font-mono"
              placeholder={
                compiler === 'angular'
                  ? `Paste Angular HTML code here and JSX will be output on the right using custom Angular to JSX code`
                  : `Paste Handlebars code here and JSX will be output on the right using jsx-to-handlebars library`
              }
              value={code}
              onChange={(event) => setCode(event.target.value)}
            ></textarea>
          </div>
          <textarea
            className="flex-1 font-mono"
            readOnly
            value={output}
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
        </div>
      </div>
    </>
  );
}
