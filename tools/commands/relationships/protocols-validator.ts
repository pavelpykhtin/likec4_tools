import { LikeC4Model } from "likec4";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
};

export interface ValidationError {
  message: String;
  validator: String;
}

export abstract class BaseValidator {
  protected isSuppressed(x: { metadata?: any }) {
    return !!x.metadata?.[`suppress${this.constructor.name}`];
  }

  abstract validate(): ValidationError[];
}

export interface ProtocolsValidatorOptions {
  ignoreProtocols?: boolean;
  ignoreProtection?: boolean;
}

export class ProtocolsValidator extends BaseValidator {
  constructor(
    private model: LikeC4Model,
    private options?: ProtocolsValidatorOptions
  ) {
    super();
  }

  validate() {
    return this.model
        .relationships()
        .filter((r: LikeC4Model.Relation) => !this.isSuppressed(r.$relationship))
        .flatMap((r: LikeC4Model.Relation) => {
          return [...this.validateProtection(r), ...this.validateProtocol(r)];
        }).toArray();
  }

  private *validateProtection(r: LikeC4Model.Relation) {
    if (!this.options.ignoreProtection && !r.$relationship.metadata?.protection) {
      yield {
        message: `${colors.red}Relationship '${r.title}' between ${colors.yellow}${r.source.id}${colors.red} and ${colors.yellow}${r.target.id}${colors.red} has no protection mechanism specified`,
        validator: this.constructor.name
      };
    }
  }

  private *validateProtocol(r: LikeC4Model.Relation) {
    if (!this.options.ignoreProtocols && !r.technology) {
      yield {
        message: `${colors.red}Relationship '${r.title}' between ${colors.yellow}${r.source.id}${colors.red} and ${colors.yellow}${r.target.id}${colors.red} has no technology specified`,
        validator: this.constructor.name
      };
    }
  }
}
