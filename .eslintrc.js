module.exports = {
    "env": {
        "browser": true
    },
    "parserOptions": {
       "ecmaVersion": 6
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "off",
            "unix"
        ],
        "quotes": [
            "warn",
            "single",
            { "allowTemplateLiterals": true }
        ],
        "semi": [
            "warn",
            "always"
        ],
        "no-undef":[
          "off"
        ],
        "no-console":[
          "off"
        ]
    }
};
