const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');
const { body, validationResult} = require("express-validator");

const async = require('async');
const book = require('../models/book');
const bookinstance = require('../models/bookinstance');

exports.index = (req, res) =>{
  async.parallel({
    book_count(callback) {
      Book.countDocuments({}, callback); 
    },
    book_instance_count(callback) {
      BookInstance.countDocuments({}, callback);
    },
    book_instance_available_count(callback) {
      BookInstance.countDocuments({ status:'Available' }, callback);
    },
    author_count(callback) {
      Author.countDocuments({}, callback);
    },
    genre_count(callback) {
      Genre.countDocuments({}, callback);
    }
  },
  (err, results) => {
    res.render('index', { title: 'Local Library Home', error: err, data: results, user: req.user});
  });
};

// 모든 책을 표시.
exports.book_list = function(req, res, next) {

  Book.find({}, 'title author')
    .sort({title : 1})
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      //Successful.
      res.render('book_list', { title: 'Book List', book_list: list_books, user: req.user});
    });

};

// 특정 책의 detail한 정보 표시
exports.book_detail = (req, res, next) => {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate("author")
          .populate("genre")
          .exec(callback);
      },
      book_instance(callback) {
        BookInstance.find( { book: req.params.id}).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // 결과가 없을때.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Successful.
      res.render("book_detail", {
        title: results.book.title,
        book: results.book,
        book_instances: results.book_instance,
        user: req.user
      });
    }
  );
};

// 책을 추가할 수 있는 폼 on Get 요청
exports.book_create_get = (req, res, next) => {
  // 책을 추가하기 위하여 필요한 작가 및 장르 가져오기.
  async.parallel(
    {
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("book_form", {
        title: "Create Book",
        authors: results.authors,
        genres: results.genres,
        user: req.user
      });
    }
  );
};

// 책을 생성하는 함수 on POST req.
exports.book_create_post = [
  // 장르를 array로 변환.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre =
        typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // 입력 확인
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // 입력 확인 후 진행.
  (req, res, next) => {
    // 에러확인.
    const errors = validationResult(req);

    // 책 객체 생성
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // 에러가 있으므로 원래 폼 상태로 복구
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }

          for (const genre of results.genres) {
            if (book.genre.includes(genre._id)) {
              genre.checked = "true";
            }
          }
          res.render("book_form", {
            title: "Create Book",
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array(),
          });
        }
      );
      return;
    }

    // 책 객체 디비에 저장.
    book.save((err) => {
      if (err) {
        return next(err);
      }
      // Successful:
      res.redirect(book.url);
    });
  },
];

// 책 삭제 요청 페이지 표시
exports.book_delete_get = (req, res, next) => {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id).exec(callback);
      }, 
      books_bookinstance(callback) {
        BookInstance.find({ book: req.params.id}).exec(callback);
      }        
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if(results.book == null) {
        // No results
        res.redirect("/catalog/books")
      }
     
      // Successful.
      res.render("book_delete", {
        title: 'Delete Book',
        book: results.book,
        books_bookinstance: results.books_bookinstance,  
        user: req.user
      });
    }
  );
};

// 책 삭제 함수 on POST.
exports.book_delete_post = (req, res, next) => {    
  async.parallel(
    {
      book(callback) {
        Book.findById(req.body.bookid).exec(callback);
      }, 
      books_bookinstance(callback) {
        BookInstance.find({ book: req.body.bookid}).exec(callback);
      }        
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Success
      if (results.books_bookinstance.length > 0) {
        res.render("book_delete", {
          title: "Delete Book",
          book: results.book,
          books_bookinstance: results.books_bookinstance,  
          user: req.user
        });
        return;
      }
      Book.findByIdAndRemove(req.body.bookid, (err) => {
        if (err) {
          return next(err);
        }
        res.redirect("/catalog/books");
      });
    }
  );
};

// 책 정보 업데이트 표시 on GET.
exports.book_update_get = (req, res, next) => {
  // 책, 작가, 장르 폼 가져오기.
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate("author")
          .populate("genre")
          .exec(callback);
      },
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Success.   
      for (const genre of results.genres) {
        for (const bookGenre of results.book.genre) {
          if (genre._id.toString() === bookGenre._id.toString()) {
            genre.checked = "true";
          }
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: results.authors,
        genres: results.genres,
        book: results.book,
        user: req.user
      });
    }
  );
};

// 책 정보 업데이트 함수 on POST.
exports.book_update_post = [
  // 장르를 array 로 변환.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // 입력 정보 확인.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }

          // Mark our selected genres as checked.
          for (const genre of results.genres) {
            if (book.genre.includes(genre._id)) {
              genre.checked = "true";
            }
          }
          res.render("book_form", {
            title: "Update Book",
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array(),
            user: req.user
          });
        }
      );
      return;
    }

    // Data from form is valid. Update the record.
    Book.findByIdAndUpdate(req.params.id, book, {}, (err, thebook) => {
      if (err) {
        return next(err);
      }

      // Successful: redirect to book detail page.
      res.redirect(thebook.url);
    });
  },
];