const Author = require('../models/author');
const async = require("async");
const Book = require("../models/book");
const { body, validationResult} = require("express-validator");

// 작가 리스트 표시
exports.author_list = function(req, res, next) {

  Author.find()
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
      if (err) { return next(err);}
      // Successful, so render
      res.render('author_list', { title: 'Author List', author_list: list_authors, user: req.user});
    });    
};

// 작가 정보 표시
// };
exports.author_detail = (req, res, next) => {
  async.parallel(
    {
      author(callback) {
        Author.findById(req.params.id).exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.params.id }, "title summary").exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        // API 에러 표시
        return next(err);
      }
      if (results.author == null) {
        // 쿼리 내용 없을때
        const err = new Error("Author not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("author_detail", {
        title: "Author Detail",
        author: results.author,
        author_books: results.authors_books,
        user: req.user
      });
    }
  );
};

// 작가 생성 폼 표시.
exports.author_create_get = (req, res, next) => {
  res.render("author_form", { title: "Create Author", user: req.user });
};

// 작가 생성 on POST.
exports.author_create_post = [
  // 입력정보 확인 및 추출.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  // 입력정보 확인 및 추출 후 실행.
  (req, res, next) => {
    // 입력 정보 에러 추출
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // 에러가 확인되면 기본값/에러 표시
      res.render("author_form", {
        title: "Create Author",
        author: req.body,
        errors: errors.array(),
      });
      return;
    }
    // 입력 정도가 valid.

    // 작가 object 생성 with trimmed data.
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });
    author.save((err) => {
      if (err) {
        return next(err);
      }
      // Successful - 작가 리스트 페이로 redirect.
      res.redirect(author.url);
    });
  },
];

// 작가 삭제 폼 표시 on Get.
exports.author_delete_get = (req, res, next) => {
  async.parallel(
    {
      author(callback) {
        Author.findById(req.params.id).exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.params.id}).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if(results.author == null) {
        // 결과 없으면.
        res.redirect("/catalog/authors");      
      }
      // Successful. 
      res.render("author_delete", {
        title: "Delete Author",
        author: results.author,
        author_books: results.authors_books,
        user: req.user
      });
    }
  );
};

// 작가 삭제를 위한 함수
exports.author_delete_post = (req, res, next) => {
  async.parallel(
    {
      author(callback) {
        Author.findById(req.body.authorid).exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.body.authorid }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Success
      if (results.authors_books.length > 0) {
        // 작가의 책이 있으면, 취소되고 author_delete Get 호출
        res.render("author_delete", {
          title: "Delete Author",
          author: results.author,
          author_books: results.authors_books,
          user: req.user
        });
        return;
      }
      // 작가에게 책이 없으면 작가를 생성할수 있으므로, 처리후 기본페이지로 redirect.
      Author.findByIdAndRemove(req.body.authorid, (err) => {
        if (err) {
          return next(err);
        }
        // Success - 작가 리스트로 리다이렉트
        res.redirect("/catalog/authors");
      });
    }
  );
};

// 작가 정보를 수정할수 있는 폼 표시.
exports.author_update_get = function (req, res, next) {

  Author.findById(req.params.id, function (err, author) {
      if (err) { return next(err); }
      if (author == null) { // No results.
          var err = new Error('Author not found');
          err.status = 404;
          return next(err);
      }
      // Success.
      res.render('author_form', { title: 'Update Author', author: author });

  });
};

// 작가 정보를 수정하는 함수 on Post.
exports.author_update_post = [

  // 입력 정보 확인 및 알맞은 정보로 추출
  body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
      .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
      .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),


  // 입력 정보 확인 및 알맞은 정보로 추출 후 진행
  (req, res, next) => {

      // 에러 표시가 있으면 추출
      const errors = validationResult(req);

      // 작가 생성
      var author = new Author(
          {
              first_name: req.body.first_name,
              family_name: req.body.family_name,
              date_of_birth: req.body.date_of_birth,
              date_of_death: req.body.date_of_death,
              _id: req.params.id
          }
      );

      if (!errors.isEmpty()) {
          // 에러가 있으면 초기 페이지로 redirect 및 에러 표시 
          res.render('author_form', { title: 'Update Author', author: author, errors: errors.array(), user: req.user });
          return;
      }
      else {
          // 정보가 valid 하면, 자료 수정.
          Author.findByIdAndUpdate(req.params.id, author, {}, function (err, theauthor) {
              if (err) { return next(err); }
              // Successful - 초기 화면으로 redirect
              res.redirect(theauthor.url);
          });
      }
  }
];