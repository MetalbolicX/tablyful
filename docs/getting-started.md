# Getting Started

This guide will help you set up and start using **Tablyful** in your projects.

## Prerequisites for Node.js

To work with Node.js, you must have version 20 or higher installed.

Check your Node.js version with the following command:

```sh
node -v
```

If you do not have Node.js installed in your current environment, or the installed version is too low, you can use [nvm](https://github.com/nvm-sh/nvm) to install the latest version of Node.js.

## Create a new project

Navigate to the folder where your project will be created and run the following command to create a new directory:

```sh
mkdir app && cd app
```

Initialize a `package.json` file using one of the following commands:

<!-- tabs:start -->

#### **npm**

```sh
npm init
```

#### **pnpm**

```sh
pnpm init
```

#### **yarn**

```sh
yarn init
```

#### **bun**

```sh
bun init
```

#### **deno**

```sh
deno init
```

<!-- tabs:end -->

### Install Dependencies

Install `tablyful` using your preferred package manager:

<!-- tabs:start -->

#### **npm**

```sh
npm install tablyful
```

#### **pnpm**

```sh
pnpm add tablyful
```

#### **yarn**

```sh
yarn add tablyful
```

#### **bun**

```sh
bun add tablyful
```

#### **deno**

```sh
deno add --npm tablyful
```

<!-- tabs:end -->

## Next Steps

Now that you have Tablyful set up, you can explore its features and capabilities. Check out the [API Reference](/api-reference) for more information on what you can do with Tablyful.
