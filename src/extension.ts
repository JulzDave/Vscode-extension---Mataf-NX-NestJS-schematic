// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { resolve } from "path";
import {} from "../schematics/NestJS/src";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "mataf-nx-nestjs-schematic" is now active!'
    );

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const nestSchematicRelativePath =
        "../schematics/NestJS/src/collection.json:nest";
    const nestSchematicAbsolutePath = resolve(nestSchematicRelativePath);
    const installSchematicCmd = `schematics ${nestSchematicAbsolutePath} --debug=false --force`;
    console.log(installSchematicCmd);

    // TODO: In package.json, change repository.url to azure repo url
    let disposable = vscode.commands.registerCommand(
        "mataf-nx-nestjs-schematic.nxNestJSSchematic",
        async () => {
            // The code you place here will be executed every time your command is executed
            if (!vscode.window.activeTerminal) {
                const newTerminalInstance = vscode.window.createTerminal();
                newTerminalInstance.show();
                newTerminalInstance.sendText(installSchematicCmd, true);
            } else {
                vscode.window.activeTerminal?.show();
                vscode.window.activeTerminal?.sendText(
                    installSchematicCmd,
                    true
                );
            }
            vscode.window.showInformationMessage(
                'You have been prompted by "Mataf custom NX-NestJS schematic".\nPlease address the integrated terminal to proceed.'
            );
        }
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
