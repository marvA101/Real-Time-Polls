interface I18nContext {
  [index : string] : string
}

class I18n {

  private lang : string;
  private translations : { [index : string] : { [index: string] : string } };
  private canTranslate : boolean;

  constructor(language : string) {
    this.lang = language;
    this.translations = null;
    this.canTranslate = false;
  }

  public getLanguage() : string {
    return this.lang;
  }

  public setLanguage(lang : string) : void {
    this.lang = lang;
    this.checkCanTranslate();
  }

  public isLanguageSupported(lang : string) : boolean {
    return this.translations == null ? false : this.translations[lang] != undefined;
  }

  private checkCanTranslate() : void {
    this.canTranslate = this.translations == null ? false : this.isLanguageSupported(this.lang);
  }

  public load(path : string = "language.json", callback? : () => void) : void {
    $.getJSON(path, data => {
      this.translations = data;
      this.checkCanTranslate();

      if (callback) {
        callback();
      }
    });
  }

  public translate(key : string, context : I18nContext = {}) : string {
    if (!this.canTranslate) {
      return "";
    }

    let str = this.translations[this.lang][key];
    if (str == null) {
      return "";
    }

    for (let name in context) {
      let regexp = new RegExp("{{" + name + "}}", "g");
      str = str.replace(regexp, context[name]);
    }
    return str;
  }

  public translatePlural(key : string, n : number, context : I18nContext = {}) {
    let str = this.translate(key, context);
    let isPlural = str.length > 0 && n != 1;
    return isPlural ? str + this.translations[this.lang]["pluralSuffix"] : str;
  }

}
