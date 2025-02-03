## About
This is a sample of how to automate generation of architecture artifacts using the model described with likec4.

## Getting started
- Clone repository 

- Install dependencies by running following commands in /tools folder:
```bash
npm i -g tsx
npm i
```

## Model
Sample model of the architecture is located in /arch folder of the repository.
Relations describe dependencies between components rather than data flows.
Trust boundaries are defined in /arch/trustBoundaries.json file.

Following conventions are used for relationships:
- **metadata.dataflowId** defines the id of the dataflow. It is used by export-threat-model command.
- **metadata.protection** specifies the mechanism which is used to protect data
- **metadata.dataType** specifies type of data passed in dataflow
- **metadata.dataflowDirection** specifies the direction of dataflow relative to relation. 

## Commands
Commands could be run with tsx tool from /tools folder. List of available commands is returned with '--help' option:

```
tsx ./index.ts --help
```

### Export the threat model
Exports artifacts related to the threat model. The artifacts include:
- list of dataflows
- list of interactors
- list of trust boundaries
- diagrams
The tag '#threatModelView' marks views which must be exported as threat model diagrams. 

```
tsx ./index.ts export-threat-model --workspace ../arch
```

### Export all relationships
Exports all defined relationships into csv file.

```
tsx ./index.ts export-relationships --workspace ../arch
```

### Validate protocols
Enshures that all relationships of the model has the protocol (technology) and protection mechanism specified.
Useful to find gaps in the model.

```
tsx ./index.ts validate-protocols --workspace ../arch
```
