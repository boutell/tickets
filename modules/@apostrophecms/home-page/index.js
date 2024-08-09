module.exports = {
  options: {
    label: 'Home Page'
  },
  methods(self) {
    return {
      dispatchAll() {
        // Catch all URLs not matching some other page,
        // Vue will take it from there
        self.dispatch('*', req => self.setTemplate(req, 'page'));
      }
    };
  }
};
