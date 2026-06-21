#!/usr/bin/env node

import { createProgram } from './cli/main.js';

const program = createProgram();
program.parse();
