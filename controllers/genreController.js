const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body, validationResult} = require('express-validator');

// Display list of all Genre.
// exports.genre_list = (req, res) => {
//     res.send('NOT IMPLEMENTED: Genre list');
// };
exports.genre_list = function (req, res, next) {

  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres){
      if(err) { return next(err);}
      //Successful, so render      
      res.render('genre_list', { title: 'Genre List', genre_list: list_genres, user: req.user});
    });
};

// Display detail page for a specific Genre.
// exports.genre_detail = (req, res) => {
//   res.send(`NOT IMPLEMENTED: Genre detail: ${req.params.id}`);
// };
exports.genre_detail = (req, res, next) => {
  async.parallel(
    {
      genre(callback) {
        Genre.findById(req.params.id).exec(callback);
      },

      genre_books(callback) {
        Book.find( { genre: req.params.id}).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.genre == null) {
        // No results.
        const err = new Error("Genre not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render("genre_detail", {
        title: "Genre Detail",
        genre: results.genre,
        genre_books: results.genre_books,
        user: req.user
      });
    }
  );  
};

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre", user: req.user});
}

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name required").trim().isLength({ min: 1}).escape(),
  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name});

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/errors messages.
      res.render("genre_form", {
        title: "Create Genre",
        genre,
        errors: errors.array(),
        user: req.user
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name}).exec((err, found_genre) => {
        if (err) {
          return next(err);
        }

        if (found_genre) {
          // Genre exists, redirect to its detail page.
          res.redirect(found_genre.url);
        } else {
          genre.save((err) => {
            if (err) {
              return next(arr);
            }
            //Genre saved. Redirect to genre detail page.
            res.redirect(genre.url);
          });
        }
      });
    }
  }
];
