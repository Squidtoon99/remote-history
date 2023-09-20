"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

// idle timer
var timer: NodeJS.Timer | undefined;
// 1 minute
var lastHash: number;
// 15 minutes
var delay = 15 * 60 * 1000;

export function activate(context: vscode.ExtensionContext) {
  function clearIdle() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(isIdle, delay);
  }
  
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((editor) => {
      if (editor && editor.document) {
        let h: number = hash(editor.document.getText());
        if (h !== lastHash) {
          lastHash = h;
          clearIdle();
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((editor) => {
      if (editor) {
        let h: number = hash(editor.getText());
        if (h !== lastHash) {
          lastHash = h;
          clearIdle();
        }
      }
    })
  );

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(clearIdle));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(clearIdle));
  context.subscriptions.push(vscode.window.onDidChangeWindowState(clearIdle));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(clearIdle));
  context.subscriptions.push(vscode.window.onDidChangeTerminalState(clearIdle));

  // Overloading paste to know when users paste code
  let disposable = vscode.commands.registerCommand(
    "history.pasteOverload",
    () => {
      vscode.env.clipboard.readText().then((text) => {
        // vscode.window.showInformationMessage(text);
      });
      vscode.commands.executeCommand("editor.action.clipboardPasteAction");
    }
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("history.start", () => {
      // Handle all instruction files in .code
      if (vscode.workspace === undefined) {
        vscode.window.showErrorMessage("No workspace found");
        return;
      }
      vscode.workspace.findFiles(".code/*").then((files) => {
        files.forEach((file) => {
          switch (file.path) {
            case ".code/README.md":
              vscode.workspace.openTextDocument(file).then((doc) => {
                // show markdown preview
                vscode.window.showErrorMessage("Doc: "+ doc);
                vscode.commands.executeCommand(
                  "markdown.showPreviewToSide",
                  doc.uri
                );
                // switch to the src/App.java file
                vscode.workspace.findFiles("src/App.java").then((files) => {
                  files.forEach((file) => {
                    vscode.workspace.openTextDocument(file).then((doc) => {
                      vscode.window.showTextDocument(doc);
                    });
                  });
                });
              });
          }
        });
      });
    })
  );

  context.subscriptions.push(disposable);
    vscode.window.showInformationMessage("Code Server is ready!");
  vscode.commands.executeCommand("history.start");
}

// This method is called when your extension is deactivated
export function deactivate() {}
function hash(text: string): number {
  var hash = 0;
  if (text.length === 0) {
    return hash;
  }
  for (var i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash;
}

function isIdle() {
  vscode.window.showErrorMessage(
    "Your code session has been stopped due to inactivity."
  ); 
  const user = vscode.workspace.getConfiguration("history").get("user");
  var url = "https://code.squid.pink/api/v1/deployments/" + user ? user : "@me";
  var data = { action: "stop" };
  var request = require("request");
  request.post(
    url,
    {
      json: data
    },
    (error: any, res: any, body: any) => {
      if (error) {
        console.error(error);
        return;
      }
      console.log(`statusCode: ${res.statusCode}`);
      console.log(body);
    }
  );
}
