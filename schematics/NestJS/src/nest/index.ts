// Schematics packages:
import {
    Rule,
    SchematicContext,
    Tree,
    apply,
    mergeWith,
    template,
    url,
    SchematicsException,
    move,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { strings } from '@angular-devkit/core';
import { parseName } from '@schematics/angular/utility/parse-name';
import { buildDefaultPath } from '@schematics/angular/utility/project';
import {
    NodeDependency,
    addPackageJsonDependency,
    NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import { existsSync } from 'fs';
// Interfaces:
import { IDependency } from '../interfaces/dependency';
import { ISchema } from '../interfaces/schema';
// Services:
import { displayMsgToStdOut } from './services/display-message';

const WORKSPACE_PATH = 'workspace.json';
const NOT_IN_NX_WORKSPACE_MSG = 'Not an NX CLI workspace';
const SCHEMATICS_TEMPLATES_PATH = 'files'; // This path as relative to the root ./dist/nest folder

const FILES_TO_DELETE = {
    fromAppDirectory: [
        '/app.controller.spec.ts',
        '/app.controller.ts',
        '/app.service.spec.ts',
        '/app.service.ts',
        '/app.service.ts',
    ],
    fromRootDirectory: ['package-lock.json'],
};

const { Default: dependencies, Dev: devDependencies } = NodeDependencyType;

const DEPENDENCIES: IDependency[] = [
    { name: 'elastic-apm-node', version: '^3.6.1', type: dependencies },
    { name: '@nestjs/swagger', version: '^4.5.7', type: dependencies },
    { name: 'swagger-ui-express', version: '^4.1.4', type: dependencies },
    { name: 'compression', version: '^1.7.4', type: dependencies },
    { name: 'helmet', version: '^3.22.0', type: dependencies },
    { name: '@types/helmet', version: '0.0.48', type: devDependencies },
    { name: 'csurf', version: '^1.11.0', type: dependencies },
];

function filesToDelete(pluginName: string): string[] {
    const appDirectory = `apps/${pluginName}/src/app`;
    const { fromAppDirectory, fromRootDirectory } = FILES_TO_DELETE;
    const AppDirFilesWithPath = fromAppDirectory.map(
        (file): string => appDirectory + file,
    );
    return AppDirFilesWithPath.concat(fromRootDirectory);
}

function nodeDependencyFactory(
    packageName: string,
    version: string,
    nodeDependencyType: NodeDependencyType,
): NodeDependency {
    return {
        type: nodeDependencyType,
        name: packageName,
        version: version,
        overwrite: true,
    };
}

function deleteFiles(
    cb: Function,
    dasherizedPluginName: string,
    tree: Tree,
): void {
    (cb(dasherizedPluginName) as string[]).forEach((file): void => {
        if (existsSync(file)) {
            tree.delete(file);
        }
    });
}

function assignDependenciesToPackageJson(tree: Tree): void {
    DEPENDENCIES.forEach((dependency) => {
        const { name, version, type } = dependency;
        const dependencyDetails: NodeDependency = nodeDependencyFactory(
            name,
            version,
            type,
        );
        addPackageJsonDependency(tree, dependencyDetails);
    });
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.

export default function nest(options: ISchema): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const workspaceConfigBuffer = tree.read(WORKSPACE_PATH);

        if (!workspaceConfigBuffer) {
            throw new SchematicsException(NOT_IN_NX_WORKSPACE_MSG);
        }

        const workspaceConfig = JSON.parse(workspaceConfigBuffer.toString());
        const { pluginName } = options;
        const dasherizedPluginName = dasherize(pluginName);
        const pluginSrcFolderPath =
            workspaceConfig?.projects?.[dasherizedPluginName]?.sourceRoot;

        if (!pluginSrcFolderPath) {
            throw new SchematicsException(
                `Plugin ${dasherizedPluginName} not found`,
            );
        }

        const defaultProjectPath = buildDefaultPath(pluginSrcFolderPath);
        const parsedPath = parseName(defaultProjectPath, pluginName);
        const { name } = parsedPath;
        const sourceTemplates = url(SCHEMATICS_TEMPLATES_PATH);

        const sourceParameterizedTemplates = apply(sourceTemplates, [
            template({
                ...options,
                ...strings,
                name,
            }),
            move(pluginSrcFolderPath),
        ]);

        deleteFiles(filesToDelete, dasherizedPluginName, tree);
        assignDependenciesToPackageJson(tree);
        context.addTask(new NodePackageInstallTask());

        context.engine.executePostTasks().subscribe(() => {
            displayMsgToStdOut(DEPENDENCIES);
        });

        return mergeWith(sourceParameterizedTemplates)(tree, context);
    };
}
