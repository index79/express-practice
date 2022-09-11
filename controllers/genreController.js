const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body, validationResult} = require('express-validator');

// 장르 리스트 표시.
exports.genre_list = function (req, res, next) {

  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres){
      if(err) { return next(err);}
      //Successful.     
      res.render('genre_list', { title: 'Genre List', genre_list: list_genres, user: req.user});
    });
};

// 장르에 대한 디테일한 정보 표시.
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
      // Successful.
      res.render("genre_detail", {
        title: "Genre Detail",
        genre: results.genre,
        genre_books: results.genre_books,
        user: req.user
      });
    }
  );  
};

// 장르 생성 폼 표시 on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre", user: req.user});
}

// 장르 생성 on POST.
exports.genre_create_post = [
  // 입력 정보확인.
  body("name", "Genre name required").trim().isLength({ min: 1}).escape(),
  // Process request after validation and sanitization
  // 입력정보 확인후 진행
  (req, res, next) => {
    // 에러 추출.
    const errors = validationResult(req);

    // 장르 객체 생성
    const genre = new Genre({ name: req.body.name});

    if (!errors.isEmpty()) {
      /// 에러가 있으면...
      res.render("genre_form", {
        title: "Create Genre",
        genre,
        errors: errors.array(),
        user: req.user
      });
      return;
    } else {
      // 입력정보가 valid 함으로 다은 스텝인 똑같은 장르가 있는지 확인
      Genre.findOne({ name: req.body.name}).exec((err, found_genre) => {
        if (err) {
          return next(err);
        }

        if (found_genre) {
          // 똑같은 장르가 있으면 취소 후 초기 페이지로 redirect.
          res.redirect(found_genre.url);
        } else {
          genre.save((err) => {
            if (err) {
              return next(arr);
            }
            // 장르 저장
            res.redirect(genre.url);
          });
        }
      });
    }
  }
];


// 장르 삭제
exports.genre_delete_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Genre delete GET');
};

exports.genre_delete_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Genre delete POST');
};

exports.genre_update_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Genre update GET');
};

exports.genre_update_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Genre update POST');
};
