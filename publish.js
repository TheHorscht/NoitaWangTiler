const ghpages = require('gh-pages');

ghpages.publish('dist', err => {
    if(err) {
        console.log('Error publishing to gh-pages:');
        console.log(err);
    } else {
        console.log('Successfully published to gh-pages!');
    }
});